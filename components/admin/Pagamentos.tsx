'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FORMAS_PAGAMENTO, Pagamento, centavosParaTexto, dataBr, hoje, reais } from '@/lib/modelo';
import { api, avisar } from './cliente';

/** Payments of one order: register as many as needed; the balance and status update by themselves. */
export default function Pagamentos({ pedidoId, pagamentos, saldo }: { pedidoId: string; pagamentos: Pagamento[]; saldo: number }) {
  const router = useRouter();
  const [novo, setNovo] = useState({ valor: saldo > 0 ? centavosParaTexto(saldo) : '', data: hoje(), forma: 'Pix', obs: '' });
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    try {
      await api(`/api/admin/pedidos/${pedidoId}/pagamentos`, 'POST', novo);
      avisar('Pagamento registrado');
      setNovo({ ...novo, valor: '', obs: '' });
      router.refresh();
    } catch (err) {
      avisar((err as Error).message);
    }
    setOcupado(false);
  };

  const remover = async (id: string) => {
    try {
      await api(`/api/admin/pedidos/${pedidoId}/pagamentos?pagamento=${id}`, 'DELETE');
      avisar('Pagamento removido');
      router.refresh();
    } catch (err) {
      avisar((err as Error).message);
    }
    setRemovendo(null);
  };

  const ordenados = [...pagamentos].sort((a, b) => a.data.localeCompare(b.data));
  return (
    <>
      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Forma</th>
              <th>Observação</th>
              <th className="valor">Valor</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ordenados.length === 0 && (
              <tr>
                <td colSpan={5} className="vazio">
                  Nenhum pagamento registrado.
                </td>
              </tr>
            )}
            {ordenados.map((p) => (
              <tr key={p.id}>
                <td className="num">{dataBr(p.data)}</td>
                <td>{p.forma || '—'}</td>
                <td className="quebra discreto">{p.obs}</td>
                <td className="valor">{reais(p.valor)}</td>
                <td className="valor">
                  {removendo === p.id ? (
                    <span className="linha" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="botao-texto" onClick={() => setRemovendo(null)}>
                        Não
                      </button>
                      <button type="button" className="botao-texto perigo" onClick={() => remover(p.id)}>
                        Remover
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="botao-icone" aria-label={`Remover pagamento de ${dataBr(p.data)}`} onClick={() => setRemovendo(p.id)}>
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="form-pagamento" onSubmit={registrar}>
        <label htmlFor="pg-valor">
          Valor (R$)
          <input id="pg-valor" inputMode="decimal" required value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} />
        </label>
        <label htmlFor="pg-data">
          Data do pagamento
          <input id="pg-data" type="date" required value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} />
        </label>
        <label htmlFor="pg-forma">
          Forma
          <select id="pg-forma" value={novo.forma} onChange={(e) => setNovo({ ...novo, forma: e.target.value })}>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label htmlFor="pg-obs">
          Observação
          <input id="pg-obs" value={novo.obs} onChange={(e) => setNovo({ ...novo, obs: e.target.value })} placeholder="opcional" />
        </label>
        <button className="botao pequeno" disabled={ocupado}>
          {ocupado ? 'Registrando…' : 'Registrar pagamento'}
        </button>
      </form>
    </>
  );
}
