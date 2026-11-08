import { rota } from '@/lib/api';
import { exportarTudo } from '@/lib/db';
import { hoje } from '@/lib/modelo';

/** Every client, order, payment, content and history entry in one file (photos are in each artisan's .zip). */
export const GET = rota(async () => {
  const dados = { versao: 1, geradoEm: new Date().toISOString(), ...(await exportarTudo()) };
  return new Response(JSON.stringify(dados, null, 1), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="backup-painel-${hoje()}.json"`,
    },
  });
});
