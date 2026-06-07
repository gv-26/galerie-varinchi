'use client';

import './frame-composer.css';
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import * as UTIF from 'utif';

// ─── Types ───────────────────────────────────────────────────────────────────
interface FrameImageRecord {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

interface ProcessedImageRecord {
  id: string;
  name: string;
  url: string;
  frameImageId?: string | null;
  sourceImageUrl?: string | null;
  folderId?: string | null;
  displayOrder: number;
  createdAt: string;
}

interface ProcessedFolderRecord {
  id: string;
  name: string;
  parentId?: string | null;
  displayOrder: number;
  createdAt: string;
  images: ProcessedImageRecord[];
}

type Panel = 'frames' | 'process' | 'finished';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert TIFF/TIF files to standard PNG File objects client-side.
 *  Returns the original file if it is not a TIFF, or a converted PNG File if it is.
 */
async function ensureBrowserFriendlyImage(file: File): Promise<File> {
  const isTiff =
    file.name.toLowerCase().endsWith('.tiff') ||
    file.name.toLowerCase().endsWith('.tif') ||
    file.type === 'image/tiff' ||
    file.type === 'image/x-tiff';

  if (!isTiff) {
    return file;
  }

  try {
    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    if (!ifds || ifds.length === 0) {
      throw new Error(
        'This TIFF file has no readable image layers. ' +
        'Please try exporting it as PNG or JPEG from your image editor.'
      );
    }

    const ifd = ifds[0];
    UTIF.decodeImage(buffer, ifd);

    // Validate dimensions before attempting conversion
    const width = ifd.width;
    const height = ifd.height;
    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error(
        'This TIFF file has invalid dimensions. ' +
        'Please re-export it as a standard PNG or JPEG.'
      );
    }

    let rgba: Uint8Array;
    try {
      rgba = UTIF.toRGBA8(ifd);
    } catch (rgbaErr: any) {
      // toRGBA8 can fail for 16-bit, CMYK, or JPEG-compressed TIFFs
      throw new Error(
        'This TIFF uses a format not supported by the browser decoder ' +
        '(common causes: 16-bit depth, CMYK color mode, or JPEG-in-TIFF compression). ' +
        'Please flatten/export the file as a standard 8-bit RGB PNG or JPEG from Photoshop or Lightroom, then try again.'
      );
    }

    // Sanity-check: RGBA array must be exactly width × height × 4 bytes
    const expectedLength = width * height * 4;
    if (rgba.length !== expectedLength) {
      throw new Error(
        `TIFF pixel data size mismatch (got ${rgba.length} bytes, expected ${expectedLength}). ` +
        'Please export as standard 8-bit RGB PNG or JPEG and try again.'
      );
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create canvas context.');
    }

    const imgData = ctx.createImageData(width, height);
    imgData.data.set(rgba);
    ctx.putImageData(imgData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      throw new Error('Canvas conversion to PNG failed.');
    }

    const newFilename = file.name.replace(/\.[^.]+$/, '') + '.png';
    return new File([blob], newFilename, { type: 'image/png' });
  } catch (err: any) {
    console.error('TIFF decoding failed:', err);
    // Re-throw with original message if it's already descriptive, otherwise wrap it
    if (err.message && err.message.length > 30) {
      throw err;
    }
    throw new Error(`Failed to decode TIFF image: ${err.message || 'Unknown error'}`);
  }
}

/** Upload a file to S3 via presigned URL. Returns the CDN URL. */
async function uploadFilePresigned(file: File, prefix = 'frame'): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${prefix}-${Date.now()}.${ext}`;
  const res = await fetch('/api/upload/presigned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType: file.type }),
  });
  const { uploadUrl, finalUrl } = await res.json();
  await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
  return finalUrl;
}

/** Detect the bounding box of "green" pixels in an ImageData.
 *  Green heuristic: G > 140 AND G > R*1.4 AND G > B*1.4
 */
function detectGreenBounds(imageData: ImageData): { minX: number; minY: number; maxX: number; maxY: number; count: number } | null {
  const { data, width, height } = imageData;
  let minX = width, minY = height, maxX = -1, maxY = -1, count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (g > 140 && g > r * 1.35 && g > b * 1.35) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count++;
      }
    }
  }

  if (maxX === -1 || count < 100) return null;
  return { minX, minY, maxX, maxY, count };
}

/** Replace green pixels in the frame canvas with pixels from the artwork canvas. */
function compositeImages(
  frameImageData: ImageData,
  artworkCanvas: HTMLCanvasElement,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): ImageData {
  const { data, width } = frameImageData;
  const artCtx = artworkCanvas.getContext('2d')!;
  const artData = artCtx.getImageData(0, 0, artworkCanvas.width, artworkCanvas.height);
  const bw = bounds.maxX - bounds.minX + 1;
  const bh = bounds.maxY - bounds.minY + 1;

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (g > 140 && g > r * 1.35 && g > b * 1.35) {
        // Map this green pixel to artwork coordinates
        const ax = Math.floor(((x - bounds.minX) / bw) * artworkCanvas.width);
        const ay = Math.floor(((y - bounds.minY) / bh) * artworkCanvas.height);
        const aIdx = (ay * artworkCanvas.width + ax) * 4;
        data[idx]     = artData.data[aIdx];
        data[idx + 1] = artData.data[aIdx + 1];
        data[idx + 2] = artData.data[aIdx + 2];
        data[idx + 3] = artData.data[aIdx + 3];
      }
    }
  }
  return frameImageData;
}

/** Format a date string */
function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FrameComposerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activePanel, setActivePanel] = useState<Panel>('frames');

  // Frame images state
  const [frameImages, setFrameImages] = useState<FrameImageRecord[]>([]);
  const [frameLoading, setFrameLoading] = useState(true);
  const [frameUploading, setFrameUploading] = useState(false);

  // Process state
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);
  const [artworkDims, setArtworkDims] = useState<{ w: number; h: number } | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [processSuccess, setProcessSuccess] = useState<string | null>(null);
  const [processedFileName, setProcessedFileName] = useState('');

  // Process state - foldering
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pickerViewingFolderId, setPickerViewingFolderId] = useState<string | null>(null);
  const [pickerFolderPath, setPickerFolderPath] = useState<{ id: string; name: string }[]>([]);

  // Finished images & folders state
  const [finishedImages, setFinishedImages] = useState<ProcessedImageRecord[]>([]);
  const [folders, setFolders] = useState<ProcessedFolderRecord[]>([]);
  const [finishedLoading, setFinishedLoading] = useState(true);
  const [viewingFolderId, setViewingFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);

  // Drag and drop & Options Menu state
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'folder' | 'image' } | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [optionsMenuId, setOptionsMenuId] = useState<string | null>(null);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState<string>('');

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  // Load frame images
  const loadFrameImages = useCallback(async () => {
    setFrameLoading(true);
    try {
      const res = await fetch('/api/admin/frame-images');
      const data = await res.json();
      setFrameImages(data.frameImages || []);
    } catch (e) {
      console.error(e);
    } finally {
      setFrameLoading(false);
    }
  }, []);

  // Load finished images and folders
  const loadFinishedImages = useCallback(async () => {
    setFinishedLoading(true);
    try {
      const [resImg, resFold] = await Promise.all([
        fetch('/api/admin/processed-images'),
        fetch('/api/admin/processed-folders')
      ]);
      const dataImg = await resImg.json();
      const dataFold = await resFold.json();
      setFinishedImages(dataImg.processedImages || []);
      setFolders(dataFold.processedFolders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setFinishedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) {
      loadFrameImages();
      loadFinishedImages();
    }
  }, [user, loadFrameImages, loadFinishedImages]);

  // Auto-generate default filename when frame or artwork changes
  useEffect(() => {
    if (artworkFile && selectedFrameId && frameImages.length > 0) {
      const frame = frameImages.find(f => f.id === selectedFrameId);
      if (frame) {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const dt = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const defaultName = `${frame.name}-${artworkFile.name.replace(/\.[^.]+$/, '')}-${dt}`;
        setProcessedFileName(defaultName);
      }
    } else {
      setProcessedFileName('');
    }
  }, [selectedFrameId, artworkFile, frameImages]);

  // ── Upload frame image ──────────────────────────────────────────────────────
  const handleFrameUpload = async (file: File) => {
    const isImage = file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.tiff') || file.name.toLowerCase().endsWith('.tif');
    if (!isImage) {
      alert('Invalid file type. Please upload a valid image file (PNG, JPG, WebP, TIFF).');
      return;
    }
    setFrameUploading(true);
    try {
      const friendlyFile = await ensureBrowserFriendlyImage(file);
      const url = await uploadFilePresigned(friendlyFile, 'frame');
      await fetch('/api/admin/frame-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: friendlyFile.name.replace(/\.[^.]+$/, ''), url }),
      });
      await loadFrameImages();
    } catch (e: any) {
      console.error('Frame upload failed:', e);
      alert(e.message || 'Frame upload failed.');
    } finally {
      setFrameUploading(false);
    }
  };

  // ── Delete frame image ──────────────────────────────────────────────────────
  const handleDeleteFrame = async (id: string) => {
    if (!confirm('Delete this frame image? Processed images using it will not be affected.')) return;
    await fetch(`/api/admin/frame-images/${id}`, { method: 'DELETE' });
    setFrameImages(prev => prev.filter(f => f.id !== id));
    if (selectedFrameId === id) setSelectedFrameId(null);
  };

  // ── Delete finished image ────────────────────────────────────────────────────
  const handleDeleteFinished = async (id: string) => {
    if (!confirm('Delete this finished image?')) return;
    await fetch(`/api/admin/processed-images/${id}`, { method: 'DELETE' });
    setFinishedImages(prev => prev.filter(f => f.id !== id));
    if (lightboxUrl) setLightboxUrl(null);
  };

  // ── Delete finished folder ────────────────────────────────────────────────────
  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Delete this folder and ALL images inside it?')) return;
    await fetch(`/api/admin/processed-folders/${id}`, { method: 'DELETE' });
    setFolders(prev => prev.filter(f => f.id !== id));
    if (viewingFolderId === id) setViewingFolderId(null);
  };

  // ── Rename finished folder ────────────────────────────────────────────────────
  const handleRenameFolder = async (id: string, currentName: string) => {
    const newName = prompt('Enter new folder name:', currentName);
    if (!newName || newName.trim() === '' || newName === currentName) return;
    await fetch(`/api/admin/processed-folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() })
    });
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
  };

  // ── Rename finished image ────────────────────────────────────────────────────
  const handleRenameImage = async (id: string, currentName: string) => {
    const newName = prompt('Enter new image name:', currentName);
    if (!newName || newName.trim() === '' || newName === currentName) return;
    await fetch(`/api/admin/processed-images/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() })
    });
    setFinishedImages(prev => prev.map(img => img.id === id ? { ...img, name: newName.trim() } : img));
    // Also update the image if it is stored in the folders state
    setFolders(prev => prev.map(f => ({
      ...f,
      images: f.images.map(img => img.id === id ? { ...img, name: newName.trim() } : img)
    })));
  };

  // ── Move item out of folder ─────────────────────────────────────────────────
  const handleMoveOut = async (id: string, type: 'folder' | 'image') => {
    if (type === 'folder') {
      await fetch(`/api/admin/processed-folders/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, parentId: null })
      });
      setFolders(prev => prev.map(f => f.id === id ? { ...f, parentId: null } : f));
    } else {
      await fetch(`/api/admin/processed-images/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, folderId: null })
      });
      setFinishedImages(prev => prev.map(img => img.id === id ? { ...img, folderId: null } : img));
    }
  };

  // ── Create new folder ───────────────────────────────────────────────────────
  const handleCreateFolder = async (parentId: string | null) => {
    const name = prompt('Enter folder name:');
    if (!name || !name.trim()) return;
    try {
      const res = await fetch('/api/admin/processed-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), parentId })
      });
      if (res.ok) {
        const data = await res.json();
        setFolders(prev => [...prev, { ...data.processedFolder, images: [] }]);
      } else {
        alert('Failed to create folder');
      }
    } catch (e) {
      alert('Failed to create folder');
    }
  };

  // ── Drag and Drop handlers ──────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string, type: 'folder' | 'image') => {
    e.stopPropagation();
    setDraggedItem({ id, type });
    // Add custom data just in case
    e.dataTransfer.setData('text/plain', `${type}:${id}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem && draggedItem.id !== id) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverTargetId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTargetId(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverTargetId(null);
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);
    if (!draggedItem || draggedItem.id === targetFolderId) return;

    if (draggedItem.type === 'folder') {
      // Prevent dropping a folder into itself or if we wanted to prevent deep nesting (but let's just do it)
      await fetch(`/api/admin/processed-folders/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draggedItem.id, parentId: targetFolderId })
      });
      setFolders(prev => prev.map(f => f.id === draggedItem.id ? { ...f, parentId: targetFolderId } : f));
    } else {
      await fetch(`/api/admin/processed-images/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draggedItem.id, folderId: targetFolderId })
      });
      setFinishedImages(prev => prev.map(img => img.id === draggedItem.id ? { ...img, folderId: targetFolderId } : img));
      // Also update folders state so it visually removes/adds if needed
      setFolders(prev => prev.map(f => {
        const imgObj = finishedImages.find(i => i.id === draggedItem.id);
        if (f.id === targetFolderId && imgObj) {
          return { ...f, images: [...f.images, { ...imgObj, folderId: targetFolderId }] };
        }
        if (f.images.some(i => i.id === draggedItem.id)) {
          return { ...f, images: f.images.filter(i => i.id !== draggedItem.id) };
        }
        return f;
      }));
    }
    setDraggedItem(null);
  };

  const handleDropReorder = async (e: React.DragEvent, targetId: string, type: 'folder' | 'image') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);
    if (!draggedItem || draggedItem.id === targetId || draggedItem.type !== type) return;

    let itemsToUpdate: { id: string, type: 'folder' | 'image', displayOrder: number }[] = [];
    
    if (type === 'folder') {
      const draggedIdx = folders.findIndex(f => f.id === draggedItem.id);
      if (draggedIdx === -1) return;
      
      const parentId = folders[draggedIdx].parentId;
      const siblings = folders.filter(f => f.parentId === parentId).sort((a, b) => a.displayOrder - b.displayOrder);
      
      const dragSibIdx = siblings.findIndex(f => f.id === draggedItem.id);
      const targetSibIdx = siblings.findIndex(f => f.id === targetId);
      if (dragSibIdx === -1 || targetSibIdx === -1) return;
      
      const newSiblings = [...siblings];
      const [removed] = newSiblings.splice(dragSibIdx, 1);
      newSiblings.splice(targetSibIdx, 0, removed);
      
      const updates: { id: string, displayOrder: number }[] = [];
      newSiblings.forEach((f, idx) => {
         f.displayOrder = idx;
         updates.push({ id: f.id, displayOrder: idx });
      });
      
      setFolders(prev => prev.map(f => {
         const updated = newSiblings.find(s => s.id === f.id);
         return updated ? { ...f, displayOrder: updated.displayOrder } : f;
      }).sort((a, b) => a.displayOrder - b.displayOrder));
      
      await fetch('/api/admin/processed-folders/reorder', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ updates })
      });
    } else {
      const draggedIdx = finishedImages.findIndex(i => i.id === draggedItem.id);
      if (draggedIdx === -1) return;
      
      const folderId = finishedImages[draggedIdx].folderId;
      const siblings = finishedImages.filter(i => i.folderId === folderId).sort((a, b) => a.displayOrder - b.displayOrder);
      
      const dragSibIdx = siblings.findIndex(i => i.id === draggedItem.id);
      const targetSibIdx = siblings.findIndex(i => i.id === targetId);
      if (dragSibIdx === -1 || targetSibIdx === -1) return;
      
      const newSiblings = [...siblings];
      const [removed] = newSiblings.splice(dragSibIdx, 1);
      newSiblings.splice(targetSibIdx, 0, removed);
      
      const updates: { id: string, displayOrder: number }[] = [];
      newSiblings.forEach((i, idx) => {
         i.displayOrder = idx;
         updates.push({ id: i.id, displayOrder: idx });
      });
      
      setFinishedImages(prev => prev.map(i => {
         const updated = newSiblings.find(s => s.id === i.id);
         return updated ? { ...i, displayOrder: updated.displayOrder } : i;
      }).sort((a, b) => a.displayOrder - b.displayOrder));
      
      // Update folders state if necessary
      setFolders(prev => prev.map(f => {
         if (f.id === folderId) {
            const sortedImages = [...f.images].map(img => {
               const updated = newSiblings.find(s => s.id === img.id);
               return updated ? { ...img, displayOrder: updated.displayOrder } : img;
            }).sort((a, b) => a.displayOrder - b.displayOrder);
            return { ...f, images: sortedImages };
         }
         return f;
      }));
      
      await fetch('/api/admin/processed-images/reorder', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ updates })
      });
    }
    
    setDraggedItem(null);


  };


  // ── Artwork file selection ──────────────────────────────────────────────────
  const handleArtworkSelect = async (file: File) => {
    const isImage = file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.tiff') || file.name.toLowerCase().endsWith('.tif');
    if (!isImage) {
      setProcessError('Invalid file type. Please select a valid image file (PNG, JPG, WebP, TIFF).');
      return;
    }
    setProcessError(null);
    setProcessSuccess(null);
    setArtworkFile(null);
    setArtworkPreviewUrl(null);
    setArtworkDims(null);

    try {
      const friendlyFile = await ensureBrowserFriendlyImage(file);
      const url = URL.createObjectURL(friendlyFile);
      setArtworkFile(friendlyFile);
      setArtworkPreviewUrl(url);

      const img = new Image();
      img.onload = () => setArtworkDims({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => {
        setProcessError('Failed to parse image dimensions. The file might be corrupted.');
      };
      img.src = url;
    } catch (err: any) {
      setProcessError(err.message || 'Failed to process selected image.');
    }
  };

  // ── Process / Composite ─────────────────────────────────────────────────────
  const handleProcess = async () => {
    if (!artworkFile || !selectedFrameId) return;

    const frameRecord = frameImages.find(f => f.id === selectedFrameId);
    if (!frameRecord) return;

    setProcessing(true);
    setProcessError(null);
    setProcessSuccess(null);

    try {
      // 1. Load frame image into a canvas
      //    Use fetch → blob URL to avoid CORS/tainted-canvas issues with S3/CloudFront.
      let frameBlobUrl: string;
      const proxyUrl = `/api/admin/fetch-frame?url=${encodeURIComponent(frameRecord.url)}`;
      try {
        const frameRes = await fetch(proxyUrl);
        if (!frameRes.ok) throw new Error(`HTTP ${frameRes.status}`);
        const frameBlob = await frameRes.blob();
        frameBlobUrl = URL.createObjectURL(frameBlob);
      } catch (fetchErr: any) {
        throw new Error(
          `Could not download the frame image via proxy (${fetchErr.message}). URL: ${proxyUrl}. ` +
          'Check that your adblocker is disabled and try again.'
        );
      }

      const frameImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to render the frame image into canvas.'));
        img.src = frameBlobUrl;
      });

      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = frameImg.naturalWidth;
      frameCanvas.height = frameImg.naturalHeight;
      const frameCtx = frameCanvas.getContext('2d')!;
      frameCtx.drawImage(frameImg, 0, 0);
      const frameImageData = frameCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);

      // 2. Detect green bounding box
      const bounds = detectGreenBounds(frameImageData);
      if (!bounds) {
        setProcessError('No green area detected in the selected frame image. Ensure the frame contains a clearly visible green placeholder region (R<80, G>140, B<80).');
        setProcessing(false);
        return;
      }

      const greenW = bounds.maxX - bounds.minX + 1;
      const greenH = bounds.maxY - bounds.minY + 1;
      const greenRatio = greenW / greenH;

      // 3. Check aspect ratio
      const artImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => {
          console.error('Artwork image load failed:', e, {
            name: artworkFile.name,
            type: artworkFile.type,
            size: artworkFile.size,
            previewUrl: artworkPreviewUrl,
          });
          reject(new Error(`Failed to load artwork image (${artworkFile.name}). Ensure it is a valid, uncorrupted image file.`));
        };
        img.src = artworkPreviewUrl || URL.createObjectURL(artworkFile);
      });

      const artRatio = artImg.naturalWidth / artImg.naturalHeight;
      const ratioDiff = Math.abs(artRatio - greenRatio) / greenRatio;

      if (ratioDiff > 0.05) {
        const greenAspect = `${greenW}×${greenH} (${greenRatio.toFixed(2)}:1)`;
        const artAspect = `${artImg.naturalWidth}×${artImg.naturalHeight} (${artRatio.toFixed(2)}:1)`;
        setProcessError(
          `Aspect ratio mismatch (${(ratioDiff * 100).toFixed(1)}% difference).\n\n` +
          `• Green area in frame: ${greenAspect}\n` +
          `• Artwork dimensions:  ${artAspect}\n\n` +
          `Please crop your artwork to match the frame's aspect ratio, or choose a different frame.`
        );
        setProcessing(false);
        return;
      }

      // 4. Scale artwork to green bounding box with high-quality step-down scaling
      const artCanvas = document.createElement('canvas');
      artCanvas.width = greenW;
      artCanvas.height = greenH;
      const artCtx = artCanvas.getContext('2d')!;
      artCtx.imageSmoothingEnabled = true;
      artCtx.imageSmoothingQuality = 'high';

      let curW = artImg.naturalWidth;
      let curH = artImg.naturalHeight;

      if (curW > greenW * 2 && curH > greenH * 2) {
        let tempCanvas = document.createElement('canvas');
        tempCanvas.width = curW;
        tempCanvas.height = curH;
        let tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(artImg, 0, 0, curW, curH);

        while (curW > greenW * 2 && curH > greenH * 2) {
          const nextW = Math.max(greenW, Math.floor(curW / 2));
          const nextH = Math.max(greenH, Math.floor(curH / 2));
          const nextCanvas = document.createElement('canvas');
          nextCanvas.width = nextW;
          nextCanvas.height = nextH;
          const nextCtx = nextCanvas.getContext('2d')!;
          nextCtx.imageSmoothingEnabled = true;
          nextCtx.imageSmoothingQuality = 'high';
          nextCtx.drawImage(tempCanvas, 0, 0, nextW, nextH);
          tempCanvas = nextCanvas;
          curW = nextW;
          curH = nextH;
        }
        artCtx.drawImage(tempCanvas, 0, 0, greenW, greenH);
      } else {
        artCtx.drawImage(artImg, 0, 0, greenW, greenH);
      }

      // 5. Composite
      const composited = compositeImages(frameImageData, artCanvas, bounds);
      frameCtx.putImageData(composited, 0, 0);

      // 6. Export to blob
      const blob = await new Promise<Blob>((resolve, reject) =>
        frameCanvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/png', 1.0)
      );

      // 7. Upload composited image
      const compositedFile = new File([blob], `composited-${Date.now()}.png`, { type: 'image/png' });
      const finalUrl = await uploadFilePresigned(compositedFile, 'composited');

      // 7.5 Handle folder creation if needed
      let finalFolderId = selectedFolderId === 'root' ? null : selectedFolderId;
      if (selectedFolderId === 'new') {
        if (!newFolderName.trim()) throw new Error('Folder name cannot be empty');
        const resFold = await fetch('/api/admin/processed-folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newFolderName.trim() }),
        });
        if (!resFold.ok) {
          const errData = await resFold.json();
          throw new Error(errData.error || 'Failed to create folder');
        }
        const dataFold = await resFold.json();
        finalFolderId = dataFold.processedFolder.id;
        setSelectedFolderId(finalFolderId as string);
        setNewFolderName('');
      }

      // 8. Save record
      const defaultName = `${artworkFile.name.replace(/\.[^.]+$/, '')}_in_${frameRecord.name}`;
      const name = processedFileName.trim() || defaultName;
      await fetch('/api/admin/processed-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url: finalUrl, frameImageId: selectedFrameId, sourceImageUrl: null, folderId: finalFolderId }),
      });

      await loadFinishedImages();
      setProcessSuccess('✓ Image composited and saved successfully! View it in Finished Images.');
      setActivePanel('finished');
    } catch (err: any) {
      setProcessError(err.message || 'An error occurred during processing.');
    } finally {
      setProcessing(false);
    }
  };

  // ── Download helper ────────────────────────────────────────────────────────
  const downloadImage = async (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.png`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="page-content" style={{ textAlign: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const selectedFrame = frameImages.find(f => f.id === selectedFrameId);

  return (
    <>
      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fc-lightbox" onClick={() => setLightboxUrl(null)}>
          <button className="fc-lightbox-close" onClick={() => setLightboxUrl(null)}>×</button>
          <div className="fc-lightbox-inner" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt={lightboxName} className="fc-lightbox-img" />
            <div className="fc-lightbox-actions">
              <button className="fc-lightbox-btn primary" onClick={() => downloadImage(lightboxUrl, lightboxName)}>
                ⬇ Download
              </button>
              <button className="fc-lightbox-btn" onClick={() => setLightboxUrl(null)}>
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fc-layout">
        {/* Sidebar */}
        <aside className="fc-sidebar">
          <div className="fc-sidebar-title">
            <span>🖼</span> Frame Composer
          </div>

          <button
            id="fc-btn-frames"
            className={`fc-sidebar-btn${activePanel === 'frames' ? ' active' : ''}`}
            onClick={() => setActivePanel('frames')}
          >
            <span className="fc-sidebar-icon">🖼</span>
            Frame Images
          </button>

          <button
            id="fc-btn-process"
            className={`fc-sidebar-btn${activePanel === 'process' ? ' active' : ''}`}
            onClick={() => { setActivePanel('process'); setProcessError(null); setProcessSuccess(null); }}
          >
            <span className="fc-sidebar-icon">⚙️</span>
            Process Image
          </button>

          <button
            id="fc-btn-finished"
            className={`fc-sidebar-btn${activePanel === 'finished' ? ' active' : ''}`}
            onClick={() => setActivePanel('finished')}
          >
            <span className="fc-sidebar-icon">✅</span>
            Finished Images
            {finishedImages.length > 0 && (
              <span style={{
                marginLeft: 'auto', background: 'rgba(139,115,85,0.3)', color: 'var(--color-accent)',
                borderRadius: '999px', fontSize: '10px', fontWeight: 700, padding: '1px 7px'
              }}>
                {finishedImages.length}
              </span>
            )}
          </button>

          <div style={{ marginTop: 'auto', paddingTop: 'var(--space-xl)' }}>
            <Link href="/admin" className="fc-back">
              ← Back to Dashboard
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="fc-main">

          {/* ── PANEL: Frame Images ── */}
          {activePanel === 'frames' && (
            <section>
              <div className="fc-panel-header">
                <div>
                  <h1 className="fc-panel-title">Frame Images</h1>
                  <p className="fc-panel-subtitle">
                    Upload wall + frame background images with a green placeholder area
                  </p>
                </div>
              </div>

              {/* Upload zone */}
              <div className="fc-upload-zone">
                <input
                  id="fc-frame-upload"
                  type="file"
                  accept="image/*,.tiff,.tif"
                  onChange={e => e.target.files?.[0] && handleFrameUpload(e.target.files[0])}
                />
                {frameUploading ? (
                  <>
                    <div className="fc-upload-icon">⏳</div>
                    <p className="fc-upload-label">Uploading…</p>
                  </>
                ) : (
                  <>
                    <div className="fc-upload-icon">📤</div>
                    <p className="fc-upload-label">Click or drag to upload a frame image</p>
                    <p className="fc-upload-hint">PNG or JPG — must contain a green (#00FF00-like) area as placeholder</p>
                  </>
                )}
              </div>

              {/* Grid */}
              {frameLoading ? (
                <div className="fc-empty">
                  <div className="fc-spinner fc-spinner-dark" style={{ margin: '0 auto var(--space-lg)' }} />
                  <p>Loading frame images…</p>
                </div>
              ) : frameImages.length === 0 ? (
                <div className="fc-empty">
                  <div className="fc-empty-icon">🖼</div>
                  <p className="fc-empty-title">No frame images yet</p>
                  <p className="fc-empty-desc">Upload your first frame image above to get started.</p>
                </div>
              ) : (
                <div className="fc-image-grid">
                  {frameImages.map(frame => (
                    <div
                      key={frame.id}
                      className="fc-image-card"
                      onClick={() => { setLightboxUrl(frame.url); setLightboxName(frame.name); }}
                    >
                      <div className="fc-image-card-thumb">
                        <img src={frame.url} alt={frame.name} loading="lazy" />
                      </div>
                      <div className="fc-image-card-info">
                        <div className="fc-image-card-name" title={frame.name}>{frame.name}</div>
                        <div className="fc-image-card-date">{formatDate(frame.createdAt)}</div>
                      </div>
                      <div className="fc-image-card-actions">
                        <button
                          className="fc-card-action-btn danger"
                          title="Delete"
                          onClick={e => { e.stopPropagation(); handleDeleteFrame(frame.id); }}
                        >🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── PANEL: Process Image ── */}
          {activePanel === 'process' && (
            <section>
              <div className="fc-panel-header">
                <div>
                  <h1 className="fc-panel-title">Process Image</h1>
                  <p className="fc-panel-subtitle">
                    Upload an artwork, select a frame, and composite them together
                  </p>
                </div>
              </div>

              {/* Error / Success */}
              {processError && (
                <div className="fc-error" style={{ whiteSpace: 'pre-wrap' }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <div>{processError}</div>
                </div>
              )}
              {processSuccess && (
                <div className="fc-success">
                  {processSuccess}
                </div>
              )}

              <div className="fc-process-layout">
                {/* Left: artwork upload */}
                <div>
                  <p className="fc-section-label">1. Upload Artwork Image</p>

                  {artworkPreviewUrl ? (
                    <div className="fc-artwork-preview">
                      <img src={artworkPreviewUrl} alt="Artwork preview" />
                      <div className="fc-artwork-meta">
                        <span>📐 {artworkDims ? `${artworkDims.w} × ${artworkDims.h}px` : '…'}</span>
                        <span>📄 {artworkFile?.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="fc-upload-zone" style={{ marginBottom: 'var(--space-lg)' }}>
                      <input
                        id="fc-artwork-upload"
                        type="file"
                        accept="image/*,.tiff,.tif"
                        onChange={e => e.target.files?.[0] && handleArtworkSelect(e.target.files[0])}
                      />
                      <div className="fc-upload-icon">🎨</div>
                      <p className="fc-upload-label">Click or drag to upload the artwork</p>
                      <p className="fc-upload-hint">This will be placed inside the frame's green area</p>
                    </div>
                  )}

                  {artworkPreviewUrl && (
                    <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)' }}>
                      <label
                        htmlFor="fc-artwork-reupload"
                        className="btn btn-secondary btn-sm"
                        style={{ cursor: 'pointer', display: 'inline-flex' }}
                      >
                        ↺ Change Image
                        <input
                          id="fc-artwork-reupload"
                          type="file"
                          accept="image/*,.tiff,.tif"
                          style={{ display: 'none' }}
                          onChange={e => e.target.files?.[0] && handleArtworkSelect(e.target.files[0])}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Right: frame selection */}
                <div>
                  <p className="fc-section-label">2. Select a Frame Template</p>

                  {selectedFrame ? (
                    <div className="fc-frame-select-label">
                      ✓ Selected: <strong>{selectedFrame.name}</strong>
                      {artworkDims && (
                        <span style={{ marginLeft: 'auto', float: 'right', color: 'var(--color-text-muted)' }}>
                          Artwork: {artworkDims.w}×{artworkDims.h}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="fc-frame-select-label">
                      Click a frame below to select it
                    </div>
                  )}

                  {frameLoading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      <div className="fc-spinner fc-spinner-dark" style={{ margin: '0 auto' }} />
                    </div>
                  ) : frameImages.length === 0 ? (
                    <div className="fc-empty">
                      <p className="fc-empty-title">No frames available</p>
                      <p className="fc-empty-desc">Upload frame images first in the Frame Images panel.</p>
                    </div>
                  ) : (
                    <div className="fc-image-grid">
                      {frameImages.map(frame => (
                        <div
                          key={frame.id}
                          className={`fc-image-card${selectedFrameId === frame.id ? ' selected' : ''}`}
                          onClick={() => { setSelectedFrameId(frame.id); setProcessError(null); }}
                        >
                          {selectedFrameId === frame.id && (
                            <div className="fc-selected-badge">Selected</div>
                          )}
                          <div className="fc-image-card-thumb">
                            <img src={frame.url} alt={frame.name} loading="lazy" />
                          </div>
                          <div className="fc-image-card-info">
                            <div className="fc-image-card-name" title={frame.name}>{frame.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-2xl)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-xl)' }}>
                <p className="fc-section-label">3. Save Destination</p>
                <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFolderPicker(true);
                      setPickerViewingFolderId(selectedFolderId === 'root' ? null : selectedFolderId);
                      const targetFolder = folders.find(f => f.id === selectedFolderId);
                      if (targetFolder) {
                         setPickerFolderPath([{ id: targetFolder.id, name: targetFolder.name }]);
                      } else {
                         setPickerFolderPath([]);
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ minWidth: '240px', justifyContent: 'flex-start', padding: '10px 16px', fontSize: '14px' }}
                  >
                    📁 {selectedFolderId === 'root' ? 'Unfoldered (Root)' : folders.find(f => f.id === selectedFolderId)?.name || 'Select Folder...'}
                  </button>
                </div>

                <p className="fc-section-label">4. File Name</p>
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <input
                    type="text"
                    placeholder="Enter file name"
                    value={processedFileName}
                    onChange={e => setProcessedFileName(e.target.value)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: '14px',
                      backgroundColor: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      width: '100%',
                      maxWidth: '500px'
                    }}
                  />
                </div>

                <p className="fc-section-label">5. Composite</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
                  <button
                    id="fc-process-btn"
                    className="fc-process-btn"
                    disabled={!artworkFile || !selectedFrameId || processing}
                    onClick={handleProcess}
                  >
                    {processing ? (
                      <>
                        <span className="fc-spinner" />
                        Processing…
                      </>
                    ) : (
                      '⚙ Process Image'
                    )}
                  </button>
                  {!artworkFile && (
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      Upload an artwork image to continue
                    </span>
                  )}
                  {artworkFile && !selectedFrameId && (
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      Select a frame template to continue
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 'var(--space-lg)', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                  <p>ℹ The green area in the frame image will be automatically detected and replaced with your artwork.</p>
                  <p>Aspect ratios must match within 5%. If they don't, you'll see an error with details.</p>
                </div>
              </div>
            </section>
          )}

          {/* ── PANEL: Finished Images ── */}
          {activePanel === 'finished' && (
            <section>
              <div className="fc-panel-header">
                <div>
                  <h1 className="fc-panel-title">Finished Images</h1>
                  <p className="fc-panel-subtitle">
                    {folderPath.length > 0 ? `Viewing folder: ${folderPath[folderPath.length - 1].name}` : 'Manage your folders and composited images'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {folderPath.length > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      const newPath = [...folderPath];
                      newPath.pop();
                      setFolderPath(newPath);
                      setViewingFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
                    }}>
                      ← Back to {folderPath.length > 1 ? folderPath[folderPath.length - 2].name : 'Root'}
                    </button>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => handleCreateFolder(viewingFolderId)}>
                    + Create Folder
                  </button>
                </div>
              </div>

              {finishedLoading ? (
                <div className="fc-empty">
                  <div className="fc-spinner fc-spinner-dark" style={{ margin: '0 auto var(--space-lg)' }} />
                  <p>Loading…</p>
                </div>
              ) : (
                <div className="fc-finished-grid">
                  {/* Folders */}
                  {folders.filter(f => (viewingFolderId ? f.parentId === viewingFolderId : !f.parentId)).map(folder => (
                    <div 
                      key={folder.id} 
                      className={`fc-finished-card${dragOverTargetId === folder.id ? ' fc-drag-over' : ''} fc-drag-item`} 
                      style={{ border: '2px solid var(--color-border)' }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                      onDragOver={(e) => handleDragOver(e, folder.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropReorder(e, folder.id, 'folder')}
                      onDragEnd={handleDragEnd}
                    >
                      <div 
                        className="fc-finished-thumb" 
                        onClick={() => {
                          setViewingFolderId(folder.id);
                          setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
                        }} 
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => handleDropOnFolder(e, folder.id)}
                        style={{ cursor: 'pointer', background: 'var(--color-bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}
                      >
                        📁
                      </div>
                      <div className="fc-finished-info">
                        <div className="fc-finished-name" title={folder.name}>{folder.name}</div>
                        <div className="fc-finished-meta">{(finishedImages.filter(i => i.folderId === folder.id).length + folders.filter(f => f.parentId === folder.id).length)} items • {formatDate(folder.createdAt)}</div>
                        <div className="fc-finished-actions">
                          <button className="fc-finished-btn" onClick={() => {
                            setViewingFolderId(folder.id);
                            setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
                          }}>📂 Open</button>
                          
                          <div style={{position: 'relative'}}>
                            <button className="fc-options-toggle" onClick={() => setOptionsMenuId(optionsMenuId === folder.id ? null : folder.id)}>⋮</button>
                            {optionsMenuId === folder.id && (
                              <div className="fc-options-menu">
                                <button className="fc-options-item" onClick={() => { handleRenameFolder(folder.id, folder.name); setOptionsMenuId(null); }}>✏ Rename</button>
                                {viewingFolderId && <button className="fc-options-item" onClick={() => { handleMoveOut(folder.id, 'folder'); setOptionsMenuId(null); }}>⤴ Move Out</button>}
                                <button className="fc-options-item danger" onClick={() => { handleDeleteFolder(folder.id); setOptionsMenuId(null); }}>🗑 Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Images */}
                  {finishedImages.filter(img => (viewingFolderId ? img.folderId === viewingFolderId : !img.folderId)).map(img => (
                    <div 
                      key={img.id} 
                      className="fc-finished-card fc-drag-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, img.id, 'image')}
                      onDragOver={(e) => handleDragOver(e, img.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropReorder(e, img.id, 'image')}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="fc-finished-thumb" onClick={() => { setLightboxUrl(img.url); setLightboxName(img.name); }}>
                        <img src={img.url} alt={img.name} loading="lazy" />
                      </div>
                      <div className="fc-finished-info">
                        <div className="fc-finished-name" title={img.name}>{img.name}</div>
                        <div className="fc-finished-meta">{formatDate(img.createdAt)}</div>
                        <div className="fc-finished-actions">
                          <button className="fc-finished-btn" onClick={() => { setLightboxUrl(img.url); setLightboxName(img.name); }}>🔍 View</button>
                          
                          <div style={{position: 'relative'}}>
                            <button className="fc-options-toggle" onClick={() => setOptionsMenuId(optionsMenuId === img.id ? null : img.id)}>⋮</button>
                            {optionsMenuId === img.id && (
                              <div className="fc-options-menu">
                                <button className="fc-options-item" onClick={() => { handleRenameImage(img.id, img.name); setOptionsMenuId(null); }}>✏ Rename</button>
                                <button className="fc-options-item" onClick={() => { downloadImage(img.url, img.name); setOptionsMenuId(null); }}>⬇ Download</button>
                                {viewingFolderId && <button className="fc-options-item" onClick={() => { handleMoveOut(img.id, 'image'); setOptionsMenuId(null); }}>⤴ Move Out</button>}
                                <button className="fc-options-item danger" onClick={() => { handleDeleteFinished(img.id); setOptionsMenuId(null); }}>🗑 Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {folders.filter(f => (viewingFolderId ? f.parentId === viewingFolderId : !f.parentId)).length === 0 && finishedImages.filter(img => (viewingFolderId ? img.folderId === viewingFolderId : !img.folderId)).length === 0 && (
                    <div className="fc-empty" style={{ gridColumn: '1 / -1' }}>
                      <div className="fc-empty-icon">✨</div>
                      <p className="fc-empty-title">Ready for your artwork</p>
                      <p className="fc-empty-desc">
                        {viewingFolderId ? 'This folder is empty. Drag items here.' : 'No images here yet. Go to Process Image to create your first composite.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* ── Folder Picker Modal ── */}
      {showFolderPicker && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setShowFolderPicker(false)}
        >
          <div
            style={{
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {pickerFolderPath.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newPath = [...pickerFolderPath];
                      newPath.pop();
                      setPickerFolderPath(newPath);
                      setPickerViewingFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
                    }}
                    style={{
                      padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer'
                    }}
                  >
                    ← Back to {pickerFolderPath.length > 1 ? pickerFolderPath[pickerFolderPath.length - 2].name : 'Root'}
                  </button>
                )}
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                    Select Folder
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    {pickerFolderPath.length > 0 ? `Currently in: ${pickerFolderPath[pickerFolderPath.length - 1].name}` : 'Currently in: Root'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFolderPicker(false)}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}
              >×</button>
            </div>

            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleCreateFolder(pickerViewingFolderId)}>
                + Create New Folder
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setSelectedFolderId(pickerViewingFolderId || 'root');
                  setShowFolderPicker(false);
                }}
              >
                ✓ Select This Folder
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              <div 
                style={{ padding: '12px', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(var(--color-accent-rgb, 100,80,60), 0.1)' }}
                onClick={() => {
                  setSelectedFolderId(pickerViewingFolderId || 'root');
                  setShowFolderPicker(false);
                }}
              >
                <span style={{ fontSize: '24px' }}>✅</span>
                <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>Save here: {pickerViewingFolderId ? folders.find(f => f.id === pickerViewingFolderId)?.name : 'Root'}</span>
              </div>
              
              {folders.filter(f => (pickerViewingFolderId ? f.parentId === pickerViewingFolderId : !f.parentId)).length === 0 ? (
                <p className="fc-empty-desc">No subfolders here. Click 'Create New Folder' to make one.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {folders.filter(f => (pickerViewingFolderId ? f.parentId === pickerViewingFolderId : !f.parentId)).map(folder => (
                    <div 
                      key={folder.id}
                      style={{ 
                        border: '1px solid var(--color-border)', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background 0.2s'
                      }}
                      onClick={() => {
                        setPickerViewingFolderId(folder.id);
                        setPickerFolderPath([...pickerFolderPath, { id: folder.id, name: folder.name }]);
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>📁</span>
                      <span style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
