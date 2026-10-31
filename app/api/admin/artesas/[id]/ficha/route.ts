import { NextResponse } from 'next/server';
import { estaLogada } from '@/lib/auth';
import { atualizarFicha } from '@/lib/agenda';
import { buscarArtesa } from '@/lib/store';
import { Ficha } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

const CAMPOS = ['tipo', 'previsao', 'entregueEm', 'valor', 'pagamento', 'enderecoSite', 'renovacaoDominio', 'notas'] as const;

/** Saves Isa's agenda notes for one artisan (files are handled by ./arquivos). */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  if (!(await buscarArtesa(id))) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 });
  const corpo = (await req.json()) as Partial<Ficha>;
  const ficha = await atualizarFicha(id, (f) => {
    for (const c of CAMPOS) if (typeof corpo[c] === 'string') f[c] = corpo[c].slice(0, 5000);
  });
  return NextResponse.json(ficha);
}
