import { rota, ok } from '@/lib/api';
import { salvarVagas } from '@/lib/negocio';

export const PUT = rota(async (req) => {
  const { padrao, meses } = (await req.json()) as { padrao: number; meses: Record<string, number> };
  return ok({ vagas: await salvarVagas(Number(padrao), meses ?? {}) });
});
