import { NextResponse } from 'next/server';
import { envioPorToken, envioComCliente } from '@/lib/store';
import { finalizarConteudo } from '@/lib/negocio';
import { avisarTermino } from '@/lib/aviso';
import { enderecoBase } from '@/lib/endereco';

type Ctx = { params: Promise<{ token: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const envio = await envioPorToken((await params).token);
  if (!envio) return NextResponse.json({ erro: 'Link inválido' }, { status: 404 });
  if (envio.status === 'terminou') return NextResponse.json({ ok: true });
  await finalizarConteudo(envio);
  const atual = await envioComCliente(envio.id);
  if (atual) await avisarTermino(atual.artesa, envio.pedidoId, await enderecoBase());
  return NextResponse.json({ ok: true });
}
