import 'server-only';
import { lerFoto, linkTemporario } from './store';

const TIPOS: Record<string, string> = {
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
};

/** Opens a PDF or video: a redirect to a temporary storage link, or the file itself when running locally. */
export async function respostaArquivo(caminho: string, nomeDownload?: string) {
  const link = await linkTemporario(caminho, nomeDownload);
  if (link) return Response.redirect(link, 303);
  const conteudo = await lerFoto(caminho);
  if (!conteudo) return new Response('Não encontrado', { status: 404 });
  return new Response(new Uint8Array(conteudo), {
    headers: { 'Content-Type': TIPOS[caminho.split('.').pop() ?? ''] ?? 'application/octet-stream' },
  });
}
