import { Artesa } from './types';

export function linkArtesa(base: string, token: string) {
  return `${base}/a/${token}`;
}

/** wa.me link that opens a chat with the artisan and a ready-made message containing her link. */
export function linkWhatsApp(base: string, a: Pick<Artesa, 'nome' | 'whatsapp' | 'token'>) {
  const numero = a.whatsapp.length <= 11 ? `55${a.whatsapp}` : a.whatsapp;
  const msg =
    `Oi, ${a.nome.split(' ')[0]}! Aqui está o seu link para enviar as fotos e informações do seu site:\n\n` +
    `${linkArtesa(base, a.token)}\n\n` +
    `É só tocar no link e ir preenchendo. Tudo fica salvo, então pode fazer aos poucos. Guarde esta mensagem! ♡`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}
