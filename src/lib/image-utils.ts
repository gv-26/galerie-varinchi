export async function resizeImage(file: File, maxSizeMB: number = 3): Promise<File> {
  // If already smaller than limit, return as is
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimensions for a profile picture to keep it reasonable
        const maxDimension = 1200; 
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            // Create a new File object from the blob
            const resizedFile = new File([blob], file.name, { 
              type: 'image/jpeg',
              lastModified: Date.now() 
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        }, 'image/jpeg', 0.85); // 0.85 quality is a good balance
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
