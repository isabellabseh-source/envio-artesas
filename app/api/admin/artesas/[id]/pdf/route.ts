import { estaLogada } from '@/lib/auth';
import { buscarArtesa, linkParaBaixar } from '@/lib/store';
import { gerarPdf } from '@/lib/pdf';
import { nomeArquivo } from '@/lib/nomes';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return new Response('Não autorizado', { status: 401 });
  const a = await buscarArtesa((await params).id);
  if (!a) return new Response('Não encontrada', { status: 404 });
  const pdf = await gerarPdf(a);
  const nome = `${nomeArquivo(a.atelie || a.nome)} - conteudo do site.pdf`;
  const link = await linkParaBaixar(`${a.id}.pdf`, new Uint8Array(pdf), 'application/pdf', nome);
  if (link) return Response.redirect(link, 303);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nome.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
    },
  });
}
