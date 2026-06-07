'use client';

import React, { useEffect, useRef } from 'react';
import type Quill from 'quill';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  modules?: any;
  style?: React.CSSProperties;
}

export default function QuillEditor({ value, onChange, modules, style }: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    // Dynamically import Quill
    const initQuill = async () => {
      const { default: Quill } = await import('quill');
      
      if (!editorRef.current) return;

      const quill = new Quill(editorRef.current, {
        theme: 'snow',
        modules: modules || {
          toolbar: {
            container: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike', 'blockquote'],
              [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
              ['link', 'image', 'video'],
              ['clean']
            ],
            handlers: {
              image: () => {
                const input = document.createElement('input');
                input.setAttribute('type', 'file');
                input.setAttribute('accept', 'image/*');
                input.click();

                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;

                  // 5MB Limit
                  if (file.size > 5 * 1024 * 1024) {
                    alert('Image is too large. Max size is 5MB.');
                    return;
                  }

                  const formData = new FormData();
                  formData.append('file', file);

                  try {
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (res.ok) {
                      const range = quill.getSelection();
                      quill.insertEmbed(range?.index || 0, 'image', data.url);
                    } else {
                      alert('Upload failed: ' + data.error);
                    }
                  } catch {
                    alert('Upload failed');
                  }
                };
              }
            }
          }
        },
      });

      quillRef.current = quill;

      // Set initial value
      if (value) {
        quill.root.innerHTML = value;
      }

      // Handle changes
      quill.on('text-change', () => {
        if (!isUpdatingRef.current) {
          onChange(quill.root.innerHTML);
        }
      });
    };

    initQuill();

    return () => {
      // Clean up if needed
    };
  }, []);

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      isUpdatingRef.current = true;
      quillRef.current.root.innerHTML = value || '';
      isUpdatingRef.current = false;
    }
  }, [value]);

  return (
    <div style={style}>
      <div ref={editorRef} />
    </div>
  );
}
