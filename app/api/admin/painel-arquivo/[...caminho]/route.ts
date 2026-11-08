import { estaLogada } from '@/lib/auth';
import { respostaArquivo } from '@/lib/arquivo';

type Ctx = { params: Promise<{ caminho: string[] }> };

/** Downloads a delivered file under its original name (?nome=). */
export async function GET(req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return new Response('Não autorizado', { status: 401 });
  const caminho = (await params).caminho.join('/');
  if (!caminho.startsWith('painel/')) return new Response('Não encontrado', { status: 404 });
  return respostaArquivo(caminho, new URL(req.url).searchParams.get('nome') || 'arquivo');
}
