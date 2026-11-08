import { envioPorToken, lerFoto } from '@/lib/store';
import { respostaFoto } from '@/lib/foto';

type Ctx = { params: Promise<{ token: string; caminho: string[] }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token, caminho } = await params;
  const envio = await envioPorToken(token);
  const p = caminho.join('/');
  // An artisan can only see her own photos.
  if (!envio || !p.startsWith(`${envio.id}/`)) return new Response('Não encontrado', { status: 404 });
  return respostaFoto(p, await lerFoto(p));
}
