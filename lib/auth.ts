import 'server-only';
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buscar, buscarPorChave, gravar, listar } from './db';

/**
 * Panel login: e-mail and password. The password is stored only as a scrypt hash.
 * First access: with no account created yet, ADMIN_EMAIL + ADMIN_PASSWORD (set on the server) create it.
 * Forgot the password: set ADMIN_PASSWORD again on the server and sign in with it; it replaces the old one.
 */

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;
const COOKIE = 'painel';
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000;

type Usuario = { id: string; email: string; hash: string; sal: string; versao: number; senhaEnvAplicada?: string };

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('Defina SESSION_SECRET (pelo menos 16 caracteres) nas variáveis do servidor');
  return s;
}

const assinar = (valor: string) => createHmac('sha256', segredo()).update(valor).digest('base64url');
const normalizar = (email: string) => email.trim().toLowerCase();

function iguais(a: string | Buffer, b: string | Buffer) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function gerarHash(senha: string) {
  const sal = randomBytes(16);
  return { hash: (await scrypt(senha, sal, 64)).toString('base64'), sal: sal.toString('base64') };
}

async function confere(u: Usuario, senha: string) {
  return iguais(await scrypt(senha, Buffer.from(u.sal, 'base64'), 64), Buffer.from(u.hash, 'base64'));
}

/** Fingerprint of ADMIN_PASSWORD, so the server password is applied once (a reset) and not on every login. */
const marcaSenhaEnv = (senha: string) => assinar(`env:${senha}`);

// Simple brute-force brake: 8 wrong attempts in 15 minutes locks that address for 15 minutes.
const tentativas = new Map<string, number[]>();
export function bloqueado(ip: string) {
  const agora = Date.now();
  const lista = (tentativas.get(ip) ?? []).filter((t) => agora - t < 15 * 60 * 1000);
  tentativas.set(ip, lista);
  return lista.length >= 8;
}
const anotarFalha = (ip: string) => tentativas.set(ip, [...(tentativas.get(ip) ?? []), Date.now()]);

/** Returns the user when e-mail and password match. */
export async function entrar(emailBruto: string, senha: string, ip: string): Promise<Usuario | null> {
  const email = normalizar(emailBruto);
  if (!email || !senha) return null;
  const envEmail = normalizar(process.env.ADMIN_EMAIL ?? '');
  const envSenha = process.env.ADMIN_PASSWORD ?? '';
  let u = await buscarPorChave<Usuario>('usuarios', email);

  // First access, or password reset through the server settings.
  if (envEmail && envSenha && email === envEmail && iguais(assinar(senha), assinar(envSenha))) {
    const marca = marcaSenhaEnv(envSenha);
    if (!u) {
      const existentes = await listar<Usuario>('usuarios');
      if (existentes.length === 0) {
        u = { id: randomBytes(8).toString('hex'), email, ...(await gerarHash(senha)), versao: 1, senhaEnvAplicada: marca };
        await gravar('usuarios', u, email);
        return u;
      }
    } else if (u.senhaEnvAplicada !== marca) {
      u = { ...u, ...(await gerarHash(senha)), versao: u.versao + 1, senhaEnvAplicada: marca };
      await gravar('usuarios', u, email);
      return u;
    }
  }

  if (u && (await confere(u, senha))) return u;
  anotarFalha(ip);
  return null;
}

export async function trocarSenha(id: string, atual: string, nova: string) {
  const u = await buscar<Usuario>('usuarios', id);
  if (!u || !(await confere(u, atual))) return 'Senha atual incorreta';
  if (nova.length < 8) return 'A nova senha precisa ter pelo menos 8 caracteres';
  const novo = { ...u, ...(await gerarHash(nova)), versao: u.versao + 1 };
  await gravar('usuarios', novo, novo.email);
  await iniciarSessao(novo);
  return null;
}

export async function iniciarSessao(u: Pick<Usuario, 'id' | 'versao'>) {
  const expira = Date.now() + DURACAO_MS;
  const corpo = `${u.id}.${u.versao}.${expira}`;
  (await cookies()).set(COOKIE, `${corpo}.${assinar(corpo)}`, {
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

/** The signed-in user, or null. Changing the password signs out every other device. */
export async function usuarioAtual(): Promise<{ id: string; email: string } | null> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return null;
  const partes = valor.split('.');
  if (partes.length !== 4) return null;
  const [id, versao, expira, assinatura] = partes;
  if (Number(expira) < Date.now() || !iguais(assinatura, assinar(`${id}.${versao}.${expira}`))) return null;
  const u = await buscar<Usuario>('usuarios', id);
  if (!u || String(u.versao) !== versao) return null;
  return { id: u.id, email: u.email };
}

export async function estaLogada() {
  return !!(await usuarioAtual());
}

/** For admin pages: sends to the login screen when not signed in. */
export async function exigirLogin() {
  const u = await usuarioAtual();
  if (!u) redirect('/admin/login');
  return u;
}
