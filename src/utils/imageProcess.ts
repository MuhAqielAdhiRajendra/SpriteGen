/**
 * Helper to process, resize, and convert reference images to compressed base64 JPEG
 * Max dimension: 768px on longest edge
 * Max size: 2MB after compression
 */

export interface ProcessedReferenceImage {
  mimeType: 'image/jpeg';
  data: string; // pure base64 string without data: URL prefix
  previewUrl: string; // complete data URL for preview in UI
  name: string;
}

export async function processImageFile(file: File | Blob, customName?: string): Promise<ProcessedReferenceImage> {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (file.type && !validTypes.includes(file.type.toLowerCase())) {
    throw new Error('Format gambar tidak didukung. Gunakan PNG, JPEG, atau WebP.');
  }

  // Load into Image
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.readAsDataURL(file);
  });

  return processDataUrl(dataUrl, customName || (file as File).name || 'reference.jpg');
}

export async function processDataUrl(dataUrl: string, name: string): Promise<ProcessedReferenceImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        const maxDim = 768;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Gagal inisialisasi kanvas 2D untuk kompresi.'));
        }

        // Fill white background in case of transparent PNG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64Data = compressedDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        // Check size (approx 3/4 of base64 string length)
        const sizeBytes = Math.round((base64Data.length * 3) / 4);
        if (sizeBytes > 2 * 1024 * 1024) {
          return reject(new Error('Ukuran gambar melebihi batas 2 MB setelah kompresi.'));
        }

        resolve({
          mimeType: 'image/jpeg',
          data: base64Data,
          previewUrl: compressedDataUrl,
          name,
        });
      } catch (err: any) {
        reject(new Error(`Gagal memproses gambar: ${err.message}`));
      }
    };
    img.onerror = () => reject(new Error('Gagal memuat elemen gambar.'));
    img.src = dataUrl;
  });
}

export async function loadPresetImage(url: string, name: string): Promise<ProcessedReferenceImage> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Gagal mengunduh preset gambar dari ${url}`);
  }
  const blob = await resp.blob();
  return processImageFile(blob, name);
}
