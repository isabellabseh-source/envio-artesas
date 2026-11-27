import { estaLogada } from '@/lib/auth';
import { envioComCliente } from '@/lib/store';
import { gerarPdf } from '@/lib/pdf';
import { nomeArquivo } from '@/lib/nomes';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return new Response('Não autorizado', { status: 401 });
  const a = (await envioComCliente((await params).id))?.artesa;
  if (!a) return new Response('Não encontrada', { status: 404 });
  let pdf: Buffer;
  try {
    pdf = await gerarPdf(a);
  } catch (e) {
    // Shows the reason on the screen (and in the server log) instead of a blank error page.
    console.error('[pdf] falha ao gerar o PDF do envio', a.id, e);
    const motivo = e instanceof Error ? e.message : String(e);
    return new Response(`Não foi possível gerar o PDF agora.\n\nMotivo técnico: ${motivo}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const nome = `${nomeArquivo(a.atelie || a.nome)} - conteudo do site.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nome.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
    },
  });
}
