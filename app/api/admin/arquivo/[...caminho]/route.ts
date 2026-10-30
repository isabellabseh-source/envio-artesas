import { estaLogada } from '@/lib/auth';
import { respostaArquivo } from '@/lib/arquivo';

type Ctx = { params: Promise<{ caminho: string[] }> };

/** Opens a PDF or video; with ?nome= it downloads under that name. */
export async function GET(req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return new Response('Não autorizado', { status: 401 });
  const nome = new URL(req.url).searchParams.get('nome') ?? undefined;
  return respostaArquivo((await params).caminho.join('/'), nome);
}
