import { NextResponse } from 'next/server';
import { estaLogada } from '@/lib/auth';
import { criarFicha } from '@/lib/agenda';
import { buscarArtesa } from '@/lib/store';

/** New agenda entry: a typed name, or an artisan from the system (name and finish date come from her). */
export async function POST(req: Request) {
  if (!(await estaLogada())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const { nome, artesaId } = (await req.json()) as { nome?: string; artesaId?: string };
  const a = artesaId ? await buscarArtesa(artesaId) : null;
  const nomeFinal = (a ? a.atelie || a.nome : nome ?? '').trim();
  if (!nomeFinal) return NextResponse.json({ erro: 'Informe o nome' }, { status: 400 });
  const id = await criarFicha({
    nome: nomeFinal.slice(0, 200),
    artesaId: a?.id,
    terminouEnvio: a?.terminou_em ? new Date(a.terminou_em).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) : '',
  });
  return NextResponse.json({ id });
}
