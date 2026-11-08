import Link from 'next/link';
import { carregarPainel } from '@/lib/negocio';
import { calcularAlertas } from '@/lib/alertas';
import { usoTotal } from '@/lib/arquivos';
import { atrasado, hoje, maiuscula, nomeMes, tamanhoBr, pago, reais, total, vagasDoMes } from '@/lib/modelo';

function Ind({ n, t, cls = '', href }: { n: React.ReactNode; t: string; cls?: string; href?: string }) {
  const corpo = (
    <>
      <strong>{n}</strong>
      <span>{t}</span>
    </>
  );
  return href ? (
    <Link href={href} className={`ind ${cls}`}>
      {corpo}
    </Link>
  ) : (
    <div className={`ind ${cls}`}>{corpo}</div>
  );
}

export default async function Dashboard() {
  const { clientes, linhas, vagas } = await carregarPainel();
  const hj = hoje();
  const mes = hj.slice(0, 7);
  const nomeDoMes = nomeMes(Number(mes.slice(5)));
  const pedidos = linhas.map((l) => l.pedido);
  const conta = (s: string) => pedidos.filter((p) => p.situacao === s).length;
  const vendido = pedidos.reduce((t, p) => t + total(p), 0);
  const recebido = pedidos.reduce((t, p) => t + pago(p), 0);
  const recebidoMes = pedidos.flatMap((p) => p.pagamentos).filter((x) => x.data.startsWith(mes)).reduce((t, x) => t + x.valor, 0);
  const vagasMes = vagasDoMes(vagas, mes);
  const ocupadas = pedidos.filter((p) => p.mes === mes).length;
  const livres = Math.max(0, vagasMes - ocupadas);
  const entregasMes = pedidos.filter((p) => p.situacao !== 'entregue' && p.fim.startsWith(mes)).length;
  const atrasados = pedidos.filter((p) => atrasado(p, hj)).length;
  const alertas = calcularAlertas(linhas, vagas, hj);
  const uso = await usoTotal();
  const dataExtenso = maiuscula(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }));
  const hora = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }));
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <header className="cabeca-pagina">
        <div>
          <h1>{saudacao}, Isa ♡</h1>
          <p>{dataExtenso}</p>
        </div>
        <div className="linha">
          <Link href="/admin/artesas/nova" className="botao secundario">
            + Nova artesã
          </Link>
          <Link href="/admin/pedidos/novo" className="botao">
            + Novo pedido
          </Link>
        </div>
      </header>

      <div className="grade-2">
        <div className="coluna">
          <section className="grupo-ind">
            <h3>Clientes e pedidos</h3>
            <div className="indicadores">
              <Ind n={clientes.length} t="artesãs cadastradas" href="/admin/artesas" />
              <Ind n={pedidos.length} t="pedidos cadastrados" href="/admin/pedidos" />
              <Ind n={atrasados} t="pedidos atrasados" cls={atrasados ? 'alerta' : ''} href="/admin/pedidos?atraso=1" />
              <Ind n={conta('pausa')} t="pedidos pausados" href="/admin/pedidos?situacao=pausa" />
            </div>
          </section>
          <section className="grupo-ind">
            <h3>Conteúdo das artesãs</h3>
            <div className="indicadores">
              <Ind n={conta('aguardando')} t="aguardando conteúdo" href="/admin/pedidos?situacao=aguardando" />
              <Ind n={conta('enviando')} t="enviando conteúdo" cls="azul" href="/admin/pedidos?situacao=enviando" />
              <Ind n={linhas.filter((l) => l.envio?.status === 'terminou').length} t="com conteúdo completo" href="/admin/pedidos?conteudo=completo" />
            </div>
          </section>
          <section className="grupo-ind">
            <h3>Produção</h3>
            <div className="indicadores">
              <Ind n={conta('dev') + conta('aprovacao')} t="sites em desenvolvimento" href="/admin/pedidos?situacao=dev" />
              <Ind n={conta('finalizado')} t="sites finalizados" href="/admin/pedidos?situacao=finalizado" />
              <Ind n={conta('entregue')} t="sites entregues" cls="verde" href="/admin/pedidos?situacao=entregue" />
              <Ind n={entregasMes} t={`entregas previstas em ${nomeDoMes}`} href={`/admin/agenda?mes=${mes}`} />
              <Ind n={`${livres} de ${vagasMes}`} t={`vagas livres em ${nomeDoMes}`} cls={livres === 0 ? 'alerta' : 'azul'} href={`/admin/agenda?mes=${mes}`} />
            </div>
          </section>
          <section className="grupo-ind">
            <h3>Financeiro</h3>
            <div className="indicadores">
              <Ind n={reais(vendido)} t="total contratado" cls="dinheiro" href="/admin/financeiro" />
              <Ind n={reais(recebido)} t="total recebido" cls="dinheiro verde" href="/admin/financeiro" />
              <Ind n={reais(vendido - recebido)} t="pendente de receber" cls="dinheiro" href="/admin/financeiro?situacao=pendente" />
              <Ind n={reais(recebidoMes)} t={`faturamento de ${nomeDoMes}`} cls="dinheiro azul" href={`/admin/financeiro?mes=${mes}`} />
            </div>
          </section>
          <p className="discreto">
            Arquivos guardados: {tamanhoBr(uso.bytes)} em{' '}
            {uso.arquivos.toLocaleString('pt-BR')} arquivos. <Link href="/admin/configuracoes">Ver espaço</Link>
          </p>
        </div>

        <section className="cartao cartao-costurado">
          <div className="cabeca-cartao">
            <h2>Alertas e pendências</h2>
            <span className="etiqueta f-nao">{alertas.length}</span>
          </div>
          {alertas.length === 0 ? (
            <p className="vazio">Tudo em dia por aqui ♡</p>
          ) : (
            <ul className="alertas">
              {alertas.map((a, i) => (
                <li key={i}>
                  <Link href={a.href}>
                    <span className={`ponto ${a.cor}`} />
                    <span>
                      <b>{a.titulo}</b>
                      <small>{a.detalhe}</small>
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
