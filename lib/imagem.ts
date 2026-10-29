const LADO_MAX = 1600;

/**
 * Shrinks a photo in the browser before upload (max 1600px, JPEG 82%),
 * so uploads are fast on mobile data. PNG is kept for logos (transparency).
 */
export async function reduzirImagem(arquivo: File, manterPng = false): Promise<Blob> {
  const png = manterPng && arquivo.type === 'image/png';
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  } catch {
    // Formats the browser cannot decode (e.g. some HEIC) go as they are if accepted by the server.
    return arquivo;
  }
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext('2d')!;
  if (!png) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao processar a foto'))), png ? 'image/png' : 'image/jpeg', 0.82),
  );
}
