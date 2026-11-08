import { NextResponse } from 'next/server';
import { bloqueado, entrar, iniciarSessao } from '@/lib/auth';

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';
  const volta = (erro: string) => NextResponse.redirect(new URL(`/admin/login?erro=${erro}`, req.url), 303);
  if (bloqueado(ip)) return volta('bloqueado');
  const form = await req.formData();
  const u = await entrar(String(form.get('email') ?? ''), String(form.get('senha') ?? ''), ip);
  if (!u) return volta('1');
  await iniciarSessao(u);
  return NextResponse.redirect(new URL('/admin', req.url), 303);
}
