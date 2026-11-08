import { ConfigVagas, hoje, somarMeses, vagasDoMes } from './modelo';
import type { Linha } from './negocio';

/** Slots for the months around today (and any month that already has orders). */
export function mesesComVagas(linhas: Pick<Linha, 'pedido'>[], vagas: ConfigVagas, antes = 1, depois = 12) {
  const atual = hoje().slice(0, 7);
  const meses = new Set<string>();
  for (let i = -antes; i <= depois; i++) meses.add(somarMeses(atual, i));
  for (const m of Object.keys(vagas.meses)) meses.add(m);
  for (const l of linhas) if (l.pedido.mes) meses.add(l.pedido.mes);
  return [...meses].sort().map((mes) => {
    const total = vagasDoMes(vagas, mes);
    const ocupadas = linhas.filter((l) => l.pedido.mes === mes).length;
    return { mes, total, ocupadas, livres: Math.max(0, total - ocupadas) };
  });
}
