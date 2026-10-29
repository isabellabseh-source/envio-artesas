import 'server-only';
import { Artesa } from './types';

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Emails Isabella when an artisan finishes. Does nothing unless RESEND_API_KEY and AVISO_EMAIL are set. */
export async function avisarTermino(artesa: Artesa, base: string) {
  const { RESEND_API_KEY, AVISO_EMAIL } = process.env;
  if (!RESEND_API_KEY || !AVISO_EMAIL) return;
  const link = `${base}/admin/${artesa.id}`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Envio de conteúdo <onboarding@resend.dev>',
        to: [AVISO_EMAIL],
        subject: `${artesa.atelie || artesa.nome} terminou de enviar o conteúdo`,
        html: `<p><strong>${esc(artesa.nome)}</strong> (${esc(artesa.atelie)}) terminou o envio.</p><p><a href="${link}">Abrir no painel</a></p>`,
      }),
    });
  } catch (e) {
    console.error('Falha ao enviar aviso por e-mail', e);
  }
}
