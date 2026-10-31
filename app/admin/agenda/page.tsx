import Link from 'next/link';
import { exigirLogin } from '@/lib/auth';
import { listarArtesas } from '@/lib/store';
import { lerFichas } from '@/lib/agenda';
import { Artesa, Ficha, STATUS_LABEL, fichaVazia } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Item = { a: Artesa; f: Ficha };

const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
const dataBr = (ymd: string) => ymd.split('-').reverse().join('/');
const mesBr = (ymd: string) => {
  const t = new Date(`${ymd.slice(0, 7)}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
/** "1.250,50" or "1250.5" → 1250.5 */
const numero = (v: string) => {
  const limpo = v.replace(/[^\d,.]/g, '');
  const n = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  return Number.isFinite(n) ? n : 0;
};
const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const somarDias = (ymd: string, dias: number) => {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

function Linha({ a, f, destaque }: Item & { destaque?: string }) {
  return (
    <li>
      <Link href={`/admin/${a.id}`} className="agenda-linha">
        <span className="artesa-nome">
          <strong>{a.atelie || a.nome}</strong>
          <span className="discreto">
            {[f.tipo, a.terminou_em && `terminou o envio em ${new Date(a.terminou_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`]
              .filter(Boolean)
              .join(' · ') || a.nome}
          </span>
        </span>
        <span className={`agenda-data ${destaque ?? ''}`}>{f.entregueEm ? `entregue ${dataBr(f.entregueEm)}` : f.previsao ? dataBr(f.previsao) : 'sem data'}</span>
        <span className={`etiqueta etiqueta-${a.status}`}>{STATUS_LABEL[a.status]}</span>
        <span className={`etiqueta pagamento-${f.pagamento === 'Pago' ? 'ok' : 'pendente'}`}>
          {f.pagamento}
          {f.valor ? ` · R$ ${f.valor}` : ''}
        </span>
      </Link>
    </li>
  );
}

export default async function Agenda() {
  await exigirLogin();
  const [artesas, fichas] = await Promise.all([listarArtesas(), lerFichas()]);
  const hj = hoje();
  const itens: Item[] = artesas.map((a) => ({ a, f: fichas[a.id] ?? fichaVazia() }));
  const entregue = ({ a, f }: Item) => a.status === 'entregue' || !!f.entregueEm;

  const abertos = itens.filter((i) => !entregue(i) && (i.f.previsao || i.a.status === 'terminou' || i.a.status === 'em_producao'));
  const atrasados = abertos.filter((i) => i.f.previsao && i.f.previsao < hj).sort((x, y) => x.f.previsao.localeCompare(y.f.previsao));
  const semData = abertos.filter((i) => !i.f.previsao);
  const porMes = new Map<string, Item[]>();
  for (const i of abertos.filter((i) => i.f.previsao >= hj).sort((x, y) => x.f.previsao.localeCompare(y.f.previsao))) {
    const mes = i.f.previsao.slice(0, 7);
    porMes.set(mes, [...(porMes.get(mes) ?? []), i]);
  }
  const entregues = itens
    .filter(entregue)
    .sort((x, y) => (y.f.entregueEm || '').localeCompare(x.f.entregueEm || ''))
    .slice(0, 15);
  const aReceber = itens.filter((i) => i.f.pagamento !== 'Pago').reduce((t, i) => t + numero(i.f.valor), 0);
  const esteMes = itens.filter((i) => i.f.entregueEm.startsWith(hj.slice(0, 7))).length;
  const renovacoes = itens
    .filter((i) => i.f.renovacaoDominio && i.f.renovacaoDominio <= somarDias(hj, 30))
    .sort((x, y) => x.f.renovacaoDominio.localeCompare(y.f.renovacaoDominio));

  return (
    <div className="painel">
      <Link href="/admin" className="botao-texto">
        ← Todas as artesãs
      </Link>
      <header className="painel-topo">
        <h1>Agenda de sites</h1>
      </header>

      <div className="resumo">
        <div className="resumo-item">
          <strong>{abertos.length}</strong>
          <span>na fila</span>
        </div>
        <div className={`resumo-item ${atrasados.length ? 'alerta' : ''}`}>
          <strong>{atrasados.length}</strong>
          <span>atrasados</span>
        </div>
        <div className="resumo-item">
          <strong>{esteMes}</strong>
          <span>entregues este mês</span>
        </div>
        <div className="resumo-item">
          <strong>{reais(aReceber)}</strong>
          <span>a receber</span>
        </div>
      </div>

      {renovacoes.length > 0 && (
        <div className="caixa-aviso">
          <strong>Domínios para renovar nos próximos 30 dias:</strong>{' '}
          {renovacoes.map(({ a, f }) => `${a.atelie || a.nome} (${dataBr(f.renovacaoDominio)})`).join(', ')}
        </div>
      )}

      {atrasados.length > 0 && (
        <section className="cartao">
          <h2>Atrasados</h2>
          <ul className="agenda-lista">
            {atrasados.map((i) => (
              <Linha key={i.a.id} {...i} destaque="atrasado" />
            ))}
          </ul>
        </section>
      )}

      {[...porMes].map(([mes, lista]) => (
        <section key={mes} className="cartao">
          <h2>
            {mesBr(mes)} <span className="discreto">· {lista.length === 1 ? '1 site' : `${lista.length} sites`}</span>
          </h2>
          <ul className="agenda-lista">
            {lista.map((i) => (
              <Linha key={i.a.id} {...i} />
            ))}
          </ul>
        </section>
      ))}

      {semData.length > 0 && (
        <section className="cartao">
          <h2>Sem previsão de entrega</h2>
          <p className="discreto">Já terminaram o envio ou estão em produção. Abra cada uma e coloque a data prevista.</p>
          <ul className="agenda-lista">
            {semData.map((i) => (
              <Linha key={i.a.id} {...i} />
            ))}
          </ul>
        </section>
      )}

      {!abertos.length && <p className="discreto">Nenhum site na fila. Quando uma artesã terminar o envio, ela aparece aqui.</p>}

      {entregues.length > 0 && (
        <section className="cartao">
          <h2>Entregues</h2>
          <ul className="agenda-lista">
            {entregues.map((i) => (
              <Linha key={i.a.id} {...i} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
