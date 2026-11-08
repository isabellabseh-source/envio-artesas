'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ADICIONAIS, FORMAS_PAGAMENTO, Pedido, SERVICOS, SITUACOES, TIPOS_SITE, centavosParaTexto, hoje, maiuscula, mesBr, paraCentavos, reais } from '@/lib/modelo';
import { api, avisar } from './cliente';

type OpcaoCliente = { id: string; nome: string; atelie: string };
type Mes = { mes: string; livres: number; total: number };

/** Create or edit an order. Creating can also register a new artisan and the down payment in one go. */
export default function FormPedido({
  pedido,
  clientes,
  meses,
  clienteInicial,
}: {
  pedido?: Pedido;
  clientes: OpcaoCliente[];
  meses: Mes[];
  clienteInicial?: string;
}) {
  const router = useRouter();
  const novo = !pedido;
  const [clienteId, setClienteId] = useState(pedido?.clienteId ?? clienteInicial ?? (clientes.length ? '' : '__novo'));
  const [nc, setNc] = useState({ nome: '', atelie: '', whatsapp: '' });
  const [v, setV] = useState({
    tipoSite: pedido?.tipoSite ?? '',
    servico: pedido?.servico ?? '',
    adicionais: pedido?.adicionais ?? [],
    situacao: pedido?.situacao ?? 'aguardando',
    contratacao: pedido?.contratacao ?? hoje(),
    mes: pedido?.mes ?? '',
    inicio: pedido?.inicio ?? '',
    fim: pedido?.fim ?? '',
    entrega: pedido?.entrega ?? '',
    valorServico: pedido ? centavosParaTexto(pedido.valorServico) : '',
    valorAdicionais: pedido ? centavosParaTexto(pedido.valorAdicionais) : '',
    saldoPrevisto: pedido?.saldoPrevisto ?? '',
    obsFinanceiras: pedido?.obsFinanceiras ?? '',
    obs: pedido?.obs ?? '',
    enderecoSite: pedido?.enderecoSite ?? '',
    renovacaoDominio: pedido?.renovacaoDominio ?? '',
  });
  const [entrada, setEntrada] = useState({ valor: '', forma: 'Pix', data: hoje() });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const campo = (k: keyof typeof v) => ({
    id: `p-${k}`,
    value: v[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value }),
  });
  const totalTexto = reais(paraCentavos(v.valorServico || '0') + paraCentavos(v.valorAdicionais || '0'));
  // The month list always includes the order's own month and the one picked from the start date.
  const listaMeses = [...meses];
  for (const m of [v.mes, v.inicio.slice(0, 7)]) if (m && !listaMeses.some((x) => x.mes === m)) listaMeses.push({ mes: m, livres: 0, total: 0 });
  listaMeses.sort((a, b) => a.mes.localeCompare(b.mes));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (clienteId === '' ) return setErro('Escolha a artesã.');
    if (clienteId === '__novo' && !nc.nome.trim()) return setErro('Informe o nome da artesã.');
    setSalvando(true);
    try {
      const corpo = { ...v, mes: v.mes || v.inicio.slice(0, 7) };
      if (novo) {
        const r = await api<{ id: string }>('/api/admin/pedidos', 'POST', {
          ...corpo,
          ...(clienteId === '__novo' ? { novoCliente: nc } : { clienteId }),
        });
        if (paraCentavos(entrada.valor) > 0) await api(`/api/admin/pedidos/${r.id}/pagamentos`, 'POST', entrada);
        avisar('Pedido cadastrado');
        router.push(`/admin/pedidos/${r.id}?aba=conteudo`);
      } else {
        await api(`/api/admin/pedidos/${pedido.id}`, 'PATCH', corpo);
        avisar('Pedido salvo');
        router.push(`/admin/pedidos/${pedido.id}`);
      }
      router.refresh();
    } catch (err) {
      setErro((err as Error).message);
      setSalvando(false);
    }
  };

  return (
    <form className="coluna" onSubmit={salvar}>
      <section className="cartao">
        <h2>Artesã</h2>
        {novo ? (
          <div className="campos">
            <label className="campo largo" htmlFor="p-cliente">
              <span className="rotulo">Artesã</span>
              <select id="p-cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Escolha…</option>
                <option value="__novo">+ Cadastrar nova artesã</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.atelie ? `${c.atelie} (${c.nome})` : c.nome}
                  </option>
                ))}
              </select>
            </label>
            {clienteId === '__novo' && (
              <>
                <label className="campo" htmlFor="nc-nome">
                  <span className="rotulo">Nome completo</span>
                  <input id="nc-nome" value={nc.nome} onChange={(e) => setNc({ ...nc, nome: e.target.value })} required />
                </label>
                <label className="campo" htmlFor="nc-atelie">
                  <span className="rotulo">Ateliê</span>
                  <input id="nc-atelie" value={nc.atelie} onChange={(e) => setNc({ ...nc, atelie: e.target.value })} />
                </label>
                <label className="campo" htmlFor="nc-zap">
                  <span className="rotulo">WhatsApp com DDD</span>
                  <input id="nc-zap" inputMode="tel" value={nc.whatsapp} onChange={(e) => setNc({ ...nc, whatsapp: e.target.value })} />
                </label>
                <p className="discreto largo">Instagram, e-mail e observações você completa depois no cadastro dela.</p>
              </>
            )}
          </div>
        ) : (
          <p>{clientes.find((c) => c.id === clienteId)?.atelie || clientes.find((c) => c.id === clienteId)?.nome}</p>
        )}
      </section>

      <section className="cartao">
        <h2>Serviço</h2>
        <div className="campos">
          <label className="campo" htmlFor="p-tipoSite">
            <span className="rotulo">Tipo de site</span>
            <select {...campo('tipoSite')}>
              <option value="">Escolha…</option>
              {TIPOS_SITE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="campo" htmlFor="p-servico">
            <span className="rotulo">Serviço contratado</span>
            <select {...campo('servico')}>
              <option value="">Escolha…</option>
              {SERVICOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
              {v.servico && !(SERVICOS as readonly string[]).includes(v.servico) && <option>{v.servico}</option>}
            </select>
          </label>
          <div className="campo largo">
            <span className="rotulo">Serviços adicionais</span>
            <div className="campo-check">
              {ADICIONAIS.map((a) => (
                <label key={a}>
                  <input
                    type="checkbox"
                    checked={v.adicionais.includes(a)}
                    onChange={(e) => setV({ ...v, adicionais: e.target.checked ? [...v.adicionais, a] : v.adicionais.filter((x) => x !== a) })}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
          {!novo && (
            <label className="campo" htmlFor="p-situacao">
              <span className="rotulo">Situação</span>
              <select {...campo('situacao')}>
                {Object.entries(SITUACOES).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="cartao">
        <h2>Datas e agenda</h2>
        <div className="campos">
          <label className="campo" htmlFor="p-contratacao">
            <span className="rotulo">Data da contratação</span>
            <input type="date" {...campo('contratacao')} />
          </label>
          <label className="campo" htmlFor="p-mes">
            <span className="rotulo">Mês em que será feito</span>
            <select {...campo('mes')}>
              <option value="">Sem mês definido</option>
              {listaMeses.map((m) => (
                <option key={m.mes} value={m.mes}>
                  {maiuscula(mesBr(m.mes))}
                  {m.total ? ` (${m.livres} de ${m.total} vagas livres)` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="campo" htmlFor="p-inicio">
            <span className="rotulo">Início previsto</span>
            <input type="date" {...campo('inicio')} />
          </label>
          <label className="campo" htmlFor="p-fim">
            <span className="rotulo">Entrega prevista</span>
            <input type="date" {...campo('fim')} />
          </label>
          {!novo && (
            <label className="campo" htmlFor="p-entrega">
              <span className="rotulo">Data efetiva de entrega</span>
              <input type="date" {...campo('entrega')} />
            </label>
          )}
        </div>
        <p className="discreto">O pedido ocupa uma vaga no mês escolhido, mesmo antes de a artesã mandar o conteúdo.</p>
      </section>

      <section className="cartao">
        <h2>Valores</h2>
        <div className="campos">
          <label className="campo" htmlFor="p-valorServico">
            <span className="rotulo">Serviço principal (R$)</span>
            <input inputMode="decimal" placeholder="700,00" {...campo('valorServico')} />
          </label>
          <label className="campo" htmlFor="p-valorAdicionais">
            <span className="rotulo">Serviços adicionais (R$)</span>
            <input inputMode="decimal" placeholder="0,00" {...campo('valorAdicionais')} />
          </label>
          <div className="campo">
            <span className="rotulo">Total contratado</span>
            <strong className="num" style={{ padding: '10px 0' }}>
              {totalTexto}
            </strong>
          </div>
          <label className="campo" htmlFor="p-saldoPrevisto">
            <span className="rotulo">Previsão para receber o restante</span>
            <input type="date" {...campo('saldoPrevisto')} />
          </label>
          <label className="campo largo" htmlFor="p-obsFinanceiras">
            <span className="rotulo">Observações financeiras</span>
            <textarea rows={2} {...campo('obsFinanceiras')} />
          </label>
        </div>
        {novo && (
          <div className="form-pagamento">
            <label htmlFor="e-valor">
              Entrada já paga (R$)
              <input id="e-valor" inputMode="decimal" placeholder="opcional" value={entrada.valor} onChange={(e) => setEntrada({ ...entrada, valor: e.target.value })} />
            </label>
            <label htmlFor="e-data">
              Data
              <input id="e-data" type="date" value={entrada.data} onChange={(e) => setEntrada({ ...entrada, data: e.target.value })} />
            </label>
            <label htmlFor="e-forma">
              Forma
              <select id="e-forma" value={entrada.forma} onChange={(e) => setEntrada({ ...entrada, forma: e.target.value })}>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      <section className="cartao">
        <h2>Site e observações</h2>
        <div className="campos">
          <label className="campo" htmlFor="p-enderecoSite">
            <span className="rotulo">Endereço do site</span>
            <input placeholder="www.…" {...campo('enderecoSite')} />
          </label>
          <label className="campo" htmlFor="p-renovacaoDominio">
            <span className="rotulo">Renovação do domínio</span>
            <input type="date" {...campo('renovacaoDominio')} />
          </label>
          <label className="campo largo" htmlFor="p-obs">
            <span className="rotulo">Observações, pendências e pedidos da cliente</span>
            <textarea rows={4} {...campo('obs')} />
          </label>
        </div>
      </section>

      {erro && <p className="erro">{erro}</p>}
      <div className="linha">
        <button className="botao" disabled={salvando}>
          {salvando ? 'Salvando…' : novo ? 'Cadastrar pedido' : 'Salvar alterações'}
        </button>
        <button type="button" className="botao secundario" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
