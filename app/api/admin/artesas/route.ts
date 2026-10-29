import { NextResponse } from 'next/server';
import { estaLogada } from '@/lib/auth';
import { criarArtesa } from '@/lib/store';

export async function POST(req: Request) {
  if (!(await estaLogada())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const { nome, atelie, whatsapp } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ erro: 'Informe o nome' }, { status: 400 });
  const artesa = await criarArtesa({ nome, atelie: atelie ?? '', whatsapp: whatsapp ?? '' });
  return NextResponse.json({ id: artesa.id });
}
