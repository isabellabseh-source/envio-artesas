'use client';

/** Calls an admin API and returns its JSON, or throws with the server's friendly message. */
export async function api<T = { ok: boolean }>(url: string, method: string, corpo?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const json = await r.json().catch(() => ({}));
  if (r.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Entre no painel de novo.');
  }
  if (!r.ok) throw new Error((json as { erro?: string }).erro || 'Não deu certo. Tente de novo.');
  return json as T;
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** A short message at the bottom of the screen. */
export function avisar(texto: string) {
  let el = document.getElementById('aviso-flutuante');
  if (!el) {
    el = document.createElement('div');
    el.id = 'aviso-flutuante';
    el.className = 'aviso-flutuante';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => el && (el.hidden = true), 3000);
}
