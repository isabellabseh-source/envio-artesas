import { NextResponse } from 'next/server';
import { buscarPorToken, caminhoValido, novoArquivo, salvarArquivoLocal } from '@/lib/store';
import { EXTENSOES, PDF_MB, VIDEO_MB } from '@/lib/types';

type Ctx = { params: Promise<{ token: string }> };

/** Prepares a PDF or video upload and returns where the browser should send it. */
export async function POST(req: Request, { params }: Ctx) {
  const artesa = await buscarPorToken((await params).token);
  if (!artesa) return NextResponse.json({ erro: 'Link inválido' }, { status: 404 });
  const { tipo, nome, tamanho } = (await req.json()) as { tipo: 'pdf' | 'video'; nome: string; tamanho: number };
  const ext = String(nome ?? '').split('.').pop()?.toLowerCase() ?? '';
  const aceitas: readonly string[] = EXTENSOES[tipo] ?? [];
  if (!aceitas.includes(ext)) return NextResponse.json({ erro: 'Formato não aceito' }, { status: 400 });
  const limite = (tipo === 'pdf' ? PDF_MB : VIDEO_MB) * 1024 * 1024;
  if (!(tamanho > 0) || tamanho > limite) return NextResponse.json({ erro: 'Arquivo muito grande' }, { status: 413 });
  return NextResponse.json(await novoArquivo(artesa.id, ext));
}

/** Local mode only (no Supabase): receives the file itself. */
export async function PUT(req: Request, { params }: Ctx) {
  if (process.env.SUPABASE_URL) return NextResponse.json({ erro: 'Use o link de envio' }, { status: 400 });
  const artesa = await buscarPorToken((await params).token);
  const caminho = new URL(req.url).searchParams.get('path') ?? '';
  if (!artesa || !caminhoValido(caminho) || !caminho.startsWith(`${artesa.id}/`)) {
    return NextResponse.json({ erro: 'Envio inválido' }, { status: 400 });
  }
  await salvarArquivoLocal(caminho, Buffer.from(await req.arrayBuffer()));
  return NextResponse.json({ ok: true });
}
