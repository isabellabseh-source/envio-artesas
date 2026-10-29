import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE = 'painel';
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000;

function segredo() {
  // Falls back to the Supabase secret key so one less setting is needed when going online.
  const s = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s || s.length < 16) throw new Error('Defina SESSION_SECRET (pelo menos 16 caracteres) no arquivo .env');
  return s;
}

function assinar(valor: string) {
  return createHmac('sha256', segredo()).update(valor).digest('base64url');
}

function iguais(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function senhaCorreta(senha: string) {
  const esperada = process.env.ADMIN_PASSWORD;
  if (!esperada) throw new Error('Defina ADMIN_PASSWORD no arquivo .env');
  return iguais(assinar(senha), assinar(esperada));
}

export async function iniciarSessao() {
  const expira = Date.now() + DURACAO_MS;
  const valor = `${expira}.${assinar(String(expira))}`;
  (await cookies()).set(COOKIE, valor, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACAO_MS / 1000,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

export async function estaLogada() {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return false;
  const [expira, assinatura] = valor.split('.');
  if (!expira || !assinatura || Number(expira) < Date.now()) return false;
  return iguais(assinatura, assinar(expira));
}

/** For admin pages: sends to the login screen when not logged in. */
export async function exigirLogin() {
  if (!(await estaLogada())) redirect('/admin/login');
}
