import { estaLogada } from '@/lib/auth';
import { abrirArquivoPainel } from '@/lib/agenda';

type Ctx = { params: Promise<{ caminho: string[] }> };

/** Downloads a delivered file under its original name (?nome=). */
export async function GET(req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return new Response('Não autorizado', { status: 401 });
  const nome = new URL(req.url).searchParams.get('nome') || 'arquivo';
  const r = await abrirArquivoPainel((await params).caminho.join('/'), nome);
  if (!r) return new Response('Não encontrado', { status: 404 });
  if ('link' in r) return Response.redirect(r.link, 303);
  return new Response(new Uint8Array(r.conteudo), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`,
    },
  });
}
