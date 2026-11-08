import 'server-only';
import { lerArquivo } from './arquivos';

const TIPOS: Record<string, string> = {
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  zip: 'application/zip',
  html: 'text/html; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
};

const cabecalhoNome = (nome: string) =>
  `attachment; filename="${nome.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(nome)}`;

/** Opens a stored file; with a name it downloads under that name. */
export async function respostaArquivo(caminho: string, nomeDownload?: string) {
  const conteudo = await lerArquivo(caminho);
  if (!conteudo) return new Response('Não encontrado', { status: 404 });
  const ext = caminho.split('.').pop() ?? '';
  const headers: Record<string, string> = {
    'Content-Type': nomeDownload ? 'application/octet-stream' : (TIPOS[ext] ?? 'application/octet-stream'),
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  };
  if (nomeDownload) headers['Content-Disposition'] = cabecalhoNome(nomeDownload);
  return new Response(new Uint8Array(conteudo), { headers });
}
