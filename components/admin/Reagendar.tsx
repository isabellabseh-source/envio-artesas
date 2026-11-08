'use client';

import { useRouter } from 'next/navigation';
import { maiuscula, mesBr } from '@/lib/modelo';
import { api, avisar } from './cliente';

/** Moves an order to another month; both months' slots update right away. Dates keep the same day. */
function mover(ymd: string, mes: string) {
  if (!ymd) return '';
  const [a, m] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${mes}-${String(Math.min(Number(ymd.slice(8, 10)), ultimo)).padStart(2, '0')}`;
}

export default function Reagendar({
  pedidoId,
  mes,
  inicio,
  fim,
  meses,
}: {
  pedidoId: string;
  mes: string;
  inicio: string;
  fim: string;
  meses: { mes: string; livres: number }[];
}) {
  const router = useRouter();
  return (
    <label className="linha" style={{ gap: 6 }}>
      Mover para
      <select
        value={mes}
        onChange={async (e) => {
          const novo = e.target.value;
          if (!novo || novo === mes) return;
          // Dates move with the month only when they were inside the old month.
          const corpo = {
            mes: novo,
            inicio: inicio.startsWith(mes) ? mover(inicio, novo) : inicio,
            fim: fim.startsWith(mes) ? mover(fim, novo) : fim,
          };
          try {
            await api(`/api/admin/pedidos/${pedidoId}`, 'PATCH', corpo);
            avisar(`Reagendado para ${mesBr(novo)}`);
            router.refresh();
          } catch (err) {
            avisar((err as Error).message);
          }
        }}
      >
        {!mes && <option value="">Escolha o mês…</option>}
        {meses.map((m) => (
          <option key={m.mes} value={m.mes}>
            {maiuscula(mesBr(m.mes))} ({m.livres} livres)
          </option>
        ))}
      </select>
    </label>
  );
}
