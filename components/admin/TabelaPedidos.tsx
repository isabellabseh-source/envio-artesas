'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Pedido,
  SERVICOS,
  SITUACOES,
  SITUACOES_FIN,
  STATUS_ENVIO,
  StatusEnvio,
  TIPOS_SITE,
  atrasado,
  dataBr,
  maiuscula,
  mesBr,
  mesCurto,
  pago,
  reais,
  saldo,
  situacaoFin,
  total,
} from '@/lib/modelo';
import { SeletorSituacao } from './Controles';
import Zap from './Zap';

export type LinhaTabela = {
  pedido: Pedido;
  cliente: { id: string; nome: string; atelie: string; whatsapp: string };
  envio: { status: StatusEnvio; pct: number } | null;
};

export type Filtros = Partial<Record<'busca' | 'mes' | 'tipo' | 'servico' | 'situacao' | 'pagamento' | 'conteudo' | 'atraso', string>>;

export default function TabelaPedidos({ linhas, iniciais, hj }: { linhas: LinhaTabela[]; iniciais: Filtros; hj: string }) {
  const router = useRouter();
  const [f, setF] = useState<Filtros>(iniciais);
  const muda = (k: keyof Filtros) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const meses = useMemo(() => [...new Set(linhas.map((l) => l.pedido.mes).filter(Boolean))].sort(), [linhas]);

  const lista = useMemo(() => {
    const b = (f.busca ?? '').toLowerCase().trim();
    return linhas
      .filter(({ pedido: p, cliente: c, envio: e }) => {
        if (b && !`${c.nome} ${c.atelie}`.toLowerCase().includes(b)) return false;
        if (f.mes && p.mes !== f.mes) return false;
        if (f.tipo && p.tipoSite !== f.tipo) return false;
        if (f.servico && p.servico !== f.servico) return false;
        if (f.situacao && p.situacao !== f.situacao) return false;
        if (f.pagamento && situacaoFin(p) !== f.pagamento) return false;
        if (f.conteudo === 'completo' && e?.status !== 'terminou') return false;
        if (f.conteudo === 'pendente' && e?.status === 'terminou') return false;
        if (f.atraso && !atrasado(p, hj)) return false;
        return true;
      })
      .sort((x, y) => (x.pedido.fim || '9999').localeCompare(y.pedido.fim || '9999'));
  }, [linhas, f, hj]);

  const limpar = Object.values(f).some(Boolean);
  const csv = '/api/admin/csv/pedidos';

  return (
    <section className="cartao">
      <div className="filtros">
        <input type="search" placeholder="Buscar artesã ou ateliê" aria-label="Buscar artesã ou ateliê" value={f.busca ?? ''} onChange={muda('busca')} />
        <select aria-label="Mês" value={f.mes ?? ''} onChange={muda('mes')}>
          <option value="">Todos os meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {maiuscula(mesBr(m))}
            </option>
          ))}
        </select>
        <select aria-label="Tipo de site" value={f.tipo ?? ''} onChange={muda('tipo')}>
          <option value="">Tipo de site</option>
          {TIPOS_SITE.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select aria-label="Serviço" value={f.servico ?? ''} onChange={muda('servico')}>
          <option value="">Serviço</option>
          {SERVICOS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Situação do pedido" value={f.situacao ?? ''} onChange={muda('situacao')}>
          <option value="">Situação do pedido</option>
          {Object.entries(SITUACOES).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
        <select aria-label="Pagamento" value={f.pagamento ?? ''} onChange={muda('pagamento')}>
          <option value="">Pagamento</option>
          {Object.entries(SITUACOES_FIN).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
        <select aria-label="Conteúdo" value={f.conteudo ?? ''} onChange={muda('conteudo')}>
          <option value="">Conteúdo</option>
          <option value="pendente">Conteúdo pendente</option>
          <option value="completo">Conteúdo completo</option>
        </select>
        {limpar && (
          <button type="button" className="botao-texto" onClick={() => setF({})}>
            Limpar filtros
          </button>
        )}
      </div>
      <p className="discreto">
        {lista.length === linhas.length ? `${linhas.length} pedidos` : `${lista.length} de ${linhas.length} pedidos`} ·{' '}
        <a href={csv}>Exportar todos em CSV</a>
      </p>
      {lista.length === 0 ? (
        <p className="vazio">{linhas.length ? 'Nenhum pedido com esses filtros.' : 'Nenhum pedido cadastrado ainda.'}</p>
      ) : (
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Artesã</th>
                <th>WhatsApp</th>
                <th>Serviço</th>
                <th>Mês</th>
                <th>Entrega prevista</th>
                <th>Situação</th>
                <th>Conteúdo</th>
                <th className="valor">Contratado</th>
                <th className="valor">Pago</th>
                <th className="valor">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(({ pedido: p, cliente: c, envio: e }) => (
                <tr key={p.id} className="clicavel" onClick={() => router.push(`/admin/pedidos/${p.id}`)}>
                  <td className="nome-cel">
                    <Link href={`/admin/pedidos/${p.id}`} onClick={(ev) => ev.stopPropagation()}>
                      <strong>{c.nome}</strong>
                      <span>{c.atelie}</span>
                    </Link>
                  </td>
                  <td onClick={(ev) => ev.stopPropagation()}>
                    <Zap numero={c.whatsapp} />
                  </td>
                  <td className="quebra">
                    {p.tipoSite && (
                      <>
                        <span className="discreto">{p.tipoSite}</span>
                        <br />
                      </>
                    )}
                    {p.servico || '—'}
                  </td>
                  <td>{mesCurto(p.mes)}</td>
                  <td className={`num ${atrasado(p, hj) ? 'atrasado-txt' : ''}`}>{p.entrega ? `entregue ${dataBr(p.entrega)}` : dataBr(p.fim)}</td>
                  <td>
                    <SeletorSituacao pedidoId={p.id} situacao={p.situacao} />
                  </td>
                  <td>
                    {e ? (
                      <>
                        <span className="barra pequena" title={`${e.pct}%`}>
                          <span className="barra-cheia" style={{ width: `${e.pct}%` }} />
                        </span>
                        <span className="discreto">
                          {STATUS_ENVIO[e.status]} · {e.pct}%
                        </span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="valor">{reais(total(p))}</td>
                  <td className="valor">{reais(pago(p))}</td>
                  <td className="valor" style={{ color: saldo(p) > 0 ? 'var(--cor-escura)' : 'var(--verde)', fontWeight: saldo(p) > 0 ? 800 : 400 }}>
                    {reais(saldo(p))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
