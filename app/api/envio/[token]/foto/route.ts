import { NextResponse } from 'next/server';
import { buscarPorToken, salvarFoto } from '@/lib/store';

type Ctx = { params: Promise<{ token: string }> };

const TAMANHO_MAX = 4 * 1024 * 1024;

export async function POST(req: Request, { params }: Ctx) {
  const artesa = await buscarPorToken((await params).token);
  if (!artesa) return NextResponse.json({ erro: 'Link inválido' }, { status: 404 });
  const form = await req.formData();
  const arquivo = form.get('foto');
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Nenhuma foto enviada' }, { status: 400 });
  if (!['image/jpeg', 'image/png'].includes(arquivo.type)) {
    return NextResponse.json({ erro: 'Formato de foto não aceito' }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAX) return NextResponse.json({ erro: 'Foto muito grande' }, { status: 413 });
  const caminho = await salvarFoto(artesa.id, Buffer.from(await arquivo.arrayBuffer()), arquivo.type);
  return NextResponse.json({ path: caminho });
}
