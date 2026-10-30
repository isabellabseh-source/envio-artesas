import { buscarPorToken } from '@/lib/store';
import { respostaArquivo } from '@/lib/arquivo';

type Ctx = { params: Promise<{ token: string; caminho: string[] }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token, caminho } = await params;
  const artesa = await buscarPorToken(token);
  const p = caminho.join('/');
  // An artisan can only open her own files.
  if (!artesa || !p.startsWith(`${artesa.id}/`)) return new Response('Não encontrado', { status: 404 });
  return respostaArquivo(p);
}
