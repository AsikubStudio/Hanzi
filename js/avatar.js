// Zdjęcie profilowe: kadr do kwadratu (środek), zmniejszenie do 128 px, JPEG jako data URL (ok. 5–9 KB).
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Nie udało się odczytać zdjęcia.')); };
    img.src = url;
  });
}

export async function fileToAvatar(file, size = 128) {
  let src = null;
  try { src = await createImageBitmap(file); } catch { /* starsze przeglądarki: <img> */ }
  src ||= await loadImage(file);
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  const side = Math.min(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // przezroczyste PNG-i dostają białe tło (JPEG nie ma alfa)
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
  src.close?.();
  return canvas.toDataURL('image/jpeg', 0.82);
}
