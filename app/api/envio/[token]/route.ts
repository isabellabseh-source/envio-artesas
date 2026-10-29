import { NextResponse } from 'next/server';
import { buscarPorToken, salvarDados } from '@/lib/store';
import { Dados } from '@/lib/types';

type Ctx = { params: Promise<{ token: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const artesa = await buscarPorToken((await params).token);
  if (!artesa) return NextResponse.json({ erro: 'Link inválido' }, { status: 404 });
  if (artesa.status !== 'nao_comecou' && artesa.status !== 'enviando') {
    return NextResponse.json({ erro: 'Envio já finalizado' }, { status: 409 });
  }
  const { dados } = (await req.json()) as { dados: Dados };
  if (!dados || !Array.isArray(dados.categorias)) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 });
  await salvarDados(artesa, dados);
  return NextResponse.json({ ok: true });
}
