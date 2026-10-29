import { buscarPorToken, lerFoto } from '@/lib/store';
import { respostaFoto } from '@/lib/foto';

type Ctx = { params: Promise<{ token: string; caminho: string[] }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token, caminho } = await params;
  const artesa = await buscarPorToken(token);
  const p = caminho.join('/');
  // An artisan can only see her own photos.
  if (!artesa || !p.startsWith(`${artesa.id}/`)) return new Response('Não encontrado', { status: 404 });
  return respostaFoto(p, await lerFoto(p));
}
