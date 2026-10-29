import { NextResponse } from 'next/server';
import { atualizarArtesa, buscarPorToken } from '@/lib/store';
import { avisarTermino } from '@/lib/aviso';

type Ctx = { params: Promise<{ token: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const artesa = await buscarPorToken((await params).token);
  if (!artesa) return NextResponse.json({ erro: 'Link inválido' }, { status: 404 });
  if (artesa.status === 'terminou') return NextResponse.json({ ok: true });
  const atualizada = await atualizarArtesa(artesa.id, { status: 'terminou', terminou_em: new Date().toISOString() });
  if (atualizada) await avisarTermino(atualizada);
  return NextResponse.json({ ok: true });
}
