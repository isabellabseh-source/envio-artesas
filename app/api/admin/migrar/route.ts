import { rota, ok } from '@/lib/api';
import { Erro } from '@/lib/negocio';
import { listarParaMigrar, migrarArtesa, migrarAvulsa } from '@/lib/migracao';

export const maxDuration = 300;

/** Lists what the old system has, so the page can import it one item at a time. */
export const GET = rota(async () => {
  try {
    return ok(await listarParaMigrar());
  } catch (e) {
    throw new Erro((e as Error).message);
  }
});

/** Imports one item: { tipo: 'artesa' | 'avulsa', id }. Safe to repeat. */
export const POST = rota(async (req) => {
  const { tipo, id } = (await req.json()) as { tipo: string; id: string };
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new Erro('Item inválido');
  try {
    return ok(tipo === 'avulsa' ? await migrarAvulsa(id) : await migrarArtesa(id));
  } catch (e) {
    throw new Erro((e as Error).message);
  }
});
