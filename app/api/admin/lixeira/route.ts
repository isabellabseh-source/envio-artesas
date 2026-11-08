import { NextResponse } from 'next/server';
import { rota, ok, naoEncontrado } from '@/lib/api';
import { apagarDeVez, restaurar } from '@/lib/negocio';

export const POST = rota(async (req) => {
  const { acao, tipo, id } = (await req.json()) as { acao: string; tipo: 'cliente' | 'pedido'; id: string };
  if (tipo !== 'cliente' && tipo !== 'pedido') return NextResponse.json({ erro: 'Tipo inválido' }, { status: 400 });
  const r = acao === 'restaurar' ? await restaurar(tipo, id) : acao === 'apagar' ? await apagarDeVez(tipo, id) : null;
  if (r === null) return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 });
  return r ? ok() : naoEncontrado();
});
