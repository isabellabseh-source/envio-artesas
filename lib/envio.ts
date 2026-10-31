/** Browser helpers for files sent straight to storage. */

/** File size for people: "850 KB", "12,5 MB". */
export const mb = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;

/** Sends a file to the storage link with upload progress (videos can take a while on mobile data). */
export function enviarComProgresso(url: string, arquivo: File, aoProgredir: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => e.lengthComputable && aoProgredir(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error('rede'));
    const corpo = new FormData();
    corpo.append('cacheControl', '3600');
    corpo.append('', arquivo);
    xhr.send(corpo);
  });
}
