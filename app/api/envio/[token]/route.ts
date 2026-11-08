import { NextResponse } from 'next/server';
import { envioPorToken } from '@/lib/store';
import { salvarConteudo } from '@/lib/negocio';
import { Dados } from '@/lib/types';

type Ctx = { params: Promise<{ token: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const envio = await envioPorToken((await params).token);
  if (!envio) return NextResponse.json({ erro: 'Link inválido' }, { status: 404 });
  if (envio.status === 'terminou') return NextResponse.json({ erro: 'Envio já finalizado' }, { status: 409 });
  const { dados } = (await req.json()) as { dados: Dados };
  if (!dados || !Array.isArray(dados.categorias)) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 });
  await salvarConteudo(envio, dados);
  return NextResponse.json({ ok: true });
}
