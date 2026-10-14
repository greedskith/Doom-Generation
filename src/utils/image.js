export const getImageDimensions = (file) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.Image) {
      resolve({ width: 800, height: 800 });
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 800 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 800, height: 800 });
    };
    img.src = objectUrl;
  });
};

export const getOptimizedUrl = (url, width) => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'res.cloudinary.com' || host.endsWith('.cloudinary.com')) {
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        return `${parts[0]}/upload/f_auto,q_auto,w_${width}/${parts[1]}`;
      }
    }

    if (host === 'images.unsplash.com' || host.endsWith('.unsplash.com')) {
      parsed.searchParams.set('w', width.toString());
      parsed.searchParams.set('auto', 'format');
      if (!parsed.searchParams.has('fit')) parsed.searchParams.set('fit', 'crop');
      if (!parsed.searchParams.has('q')) parsed.searchParams.set('q', '80');
      return parsed.toString();
    }
  } catch {
    return url;
  }
  return url;
};
