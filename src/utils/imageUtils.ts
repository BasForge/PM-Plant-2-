export function compressImageFile(
  file: File, 
  maxWidth = 960, 
  maxHeight = 960, 
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Fallback for non-image or SVG
    if (!file.type.startsWith('image/') || file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer image/jpeg with 0.7 quality to keep document sizes within Firestore limits
        const mimeType = file.type === 'image/png' && file.name.toLowerCase().endsWith('.png')
          ? 'image/jpeg' 
          : (file.type || 'image/jpeg');
        const dataUrl = canvas.toDataURL(mimeType === 'image/png' ? 'image/jpeg' : mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
