import { estaLogada } from '@/lib/auth';
import { lerFoto } from '@/lib/store';
import { respostaFoto } from '@/lib/foto';

type Ctx = { params: Promise<{ caminho: string[] }> };

export async function GET(_req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return new Response('Não autorizado', { status: 401 });
  const p = (await params).caminho.join('/');
  return respostaFoto(p, await lerFoto(p));
}
