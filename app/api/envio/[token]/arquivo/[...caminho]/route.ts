import { envioPorToken } from '@/lib/store';
import { respostaArquivo } from '@/lib/arquivo';

type Ctx = { params: Promise<{ token: string; caminho: string[] }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token, caminho } = await params;
  const envio = await envioPorToken(token);
  const p = caminho.join('/');
  // An artisan can only open her own files.
  if (!envio || !p.startsWith(`${envio.id}/`)) return new Response('Não encontrado', { status: 404 });
  return respostaArquivo(p);
}
