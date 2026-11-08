import { NextResponse } from 'next/server';
import { caminhoValido, envioPorToken, novoArquivo } from '@/lib/store';
import { salvarFluxo } from '@/lib/arquivos';
import { EXTENSOES, PDF_MB, VIDEO_MB } from '@/lib/types';

type Ctx = { params: Promise<{ token: string }> };

/** Prepares a PDF or video upload and returns where the browser should send it. */
export async function POST(req: Request, { params }: Ctx) {
  const envio = await envioPorToken((await params).token);
  if (!envio) return NextResponse.json({ erro: 'Link inválido' }, { status: 404 });
  const { tipo, nome, tamanho } = (await req.json()) as { tipo: 'pdf' | 'video'; nome: string; tamanho: number };
  const ext = String(nome ?? '').split('.').pop()?.toLowerCase() ?? '';
  const aceitas: readonly string[] = EXTENSOES[tipo] ?? [];
  if (!aceitas.includes(ext)) return NextResponse.json({ erro: 'Formato não aceito' }, { status: 400 });
  const limite = (tipo === 'pdf' ? PDF_MB : VIDEO_MB) * 1024 * 1024;
  if (!(tamanho > 0) || tamanho > limite) return NextResponse.json({ erro: 'Arquivo muito grande' }, { status: 413 });
  return NextResponse.json(await novoArquivo(envio.id, ext));
}

/** Receives the file itself and writes it straight to disk. */
export async function PUT(req: Request, { params }: Ctx) {
  const envio = await envioPorToken((await params).token);
  const caminho = new URL(req.url).searchParams.get('path') ?? '';
  if (!envio || !caminhoValido(caminho) || !caminho.startsWith(`${envio.id}/`)) {
    return NextResponse.json({ erro: 'Envio inválido' }, { status: 400 });
  }
  const limite = (caminho.endsWith('.pdf') ? PDF_MB : VIDEO_MB) * 1024 * 1024;
  try {
    await salvarFluxo(caminho, req.body, limite);
  } catch {
    return NextResponse.json({ erro: 'Arquivo muito grande ou incompleto' }, { status: 413 });
  }
  return NextResponse.json({ ok: true });
}
