import { NextResponse } from 'next/server';
import { estaLogada } from '@/lib/auth';
import { atualizarFicha, excluirFicha, lerFicha } from '@/lib/agenda';
import { Ficha } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

const CAMPOS = ['nome', 'terminouEnvio', 'tipo', 'previsao', 'entregueEm', 'valor', 'pagamento', 'enderecoSite', 'renovacaoDominio', 'notas'] as const;

/** Saves an agenda entry (files are handled by ./arquivos). */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const corpo = (await req.json()) as Partial<Ficha>;
  const ficha = await atualizarFicha((await params).id, (f) => {
    for (const c of CAMPOS) if (typeof corpo[c] === 'string') f[c] = corpo[c].slice(0, 5000);
  });
  if (!ficha) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(ficha);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await estaLogada())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  if (!(await lerFicha(id))) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });
  await excluirFicha(id);
  return NextResponse.json({ ok: true });
}
