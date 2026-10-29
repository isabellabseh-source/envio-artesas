import { NextResponse } from 'next/server';
import { iniciarSessao, senhaCorreta } from '@/lib/auth';

export async function POST(req: Request) {
  const form = await req.formData();
  if (!senhaCorreta(String(form.get('senha') ?? ''))) {
    return NextResponse.redirect(new URL('/admin/login?erro=1', req.url), 303);
  }
  await iniciarSessao();
  return NextResponse.redirect(new URL('/admin', req.url), 303);
}
