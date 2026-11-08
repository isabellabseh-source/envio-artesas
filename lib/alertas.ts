import { ConfigVagas, SITUACOES, aberto, atrasado, dataBr, diasAte, hoje, mesBr, reais, saldo, somarMeses, vagasDoMes } from './modelo';
import type { Linha } from './negocio';

export type Alerta = { cor: '' | 'vermelho' | 'amarelo' | 'azul' | 'lilas'; titulo: string; detalhe: string; href: string; ordem: number };

/** Everything that needs Isa's attention, most urgent first. */
export function calcularAlertas(linhas: Linha[], vagas: ConfigVagas, hj = hoje()): Alerta[] {
  const a: Alerta[] = [];
  const mesAtual = hj.slice(0, 7);
  const proximoMes = somarMeses(mesAtual, 1);
  for (const { pedido: p, cliente: c, envio: e } of linhas) {
    const nome = c.atelie || c.nome;
    const href = `/admin/pedidos/${p.id}`;
    if (atrasado(p, hj)) a.push({ cor: 'vermelho', titulo: `${nome}: entrega atrasada`, detalhe: `Previsto para ${dataBr(p.fim)} · ${SITUACOES[p.situacao]}`, href, ordem: 0 });
    else if (aberto(p) && p.fim && diasAte(p.fim, hj) <= 7) {
      const d = diasAte(p.fim, hj);
      a.push({ cor: 'amarelo', titulo: `${nome}: entrega ${d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`}`, detalhe: `Previsto para ${dataBr(p.fim)}`, href, ordem: 1 });
    }
    if (p.situacao === 'aguardando' && (!p.mes || p.mes <= proximoMes)) {
      a.push({ cor: '', titulo: `${nome} ainda não enviou o conteúdo`, detalhe: p.mes ? `Agendado para ${mesBr(p.mes)}` : 'Sem mês agendado', href: `${href}?aba=conteudo`, ordem: 3 });
    }
    if (e && e.status === 'enviando' && aberto(p)) {
      a.push({ cor: 'azul', titulo: `${nome} começou e não terminou o envio`, detalhe: `${e.pct}% preenchido · último envio ${dataBr(e.ultimoEnvioEm)}`, href: `${href}?aba=conteudo`, ordem: 4 });
    }
    if (p.situacao === 'pausa') a.push({ cor: 'lilas', titulo: `${nome}: pedido pausado`, detalhe: p.obs.split('\n')[0].slice(0, 90) || 'Pausa a pedido da cliente', href, ordem: 5 });
    if (p.situacao === 'enviado' && (!p.inicio || diasAte(p.inicio, hj) <= 7)) {
      a.push({ cor: '', titulo: `Começar o site de ${nome}`, detalhe: p.inicio ? `Conteúdo completo · início previsto ${dataBr(p.inicio)}` : 'Conteúdo completo', href, ordem: 2 });
    }
    if (saldo(p) > 0 && p.saldoPrevisto && diasAte(p.saldoPrevisto, hj) <= 7) {
      a.push({ cor: 'amarelo', titulo: `${nome}: ${reais(saldo(p))} a receber`, detalhe: `Previsto para ${dataBr(p.saldoPrevisto)}`, href: `${href}?aba=financeiro`, ordem: 3 });
    }
    if (p.renovacaoDominio && diasAte(p.renovacaoDominio, hj) <= 30 && diasAte(p.renovacaoDominio, hj) >= -30) {
      a.push({ cor: 'amarelo', titulo: `${nome}: renovar o domínio`, detalhe: `Renovação em ${dataBr(p.renovacaoDominio)}`, href, ordem: 6 });
    }
  }
  for (let i = 0; i < 4; i++) {
    const m = somarMeses(mesAtual, i);
    const total = vagasDoMes(vagas, m);
    const ocupadas = linhas.filter((l) => l.pedido.mes === m).length;
    if (total > 0 && ocupadas >= total) a.push({ cor: 'vermelho', titulo: `Agenda de ${mesBr(m)} lotada`, detalhe: `${ocupadas} de ${total} vagas ocupadas`, href: `/admin/agenda?mes=${m}`, ordem: 7 });
  }
  return a.sort((x, y) => x.ordem - y.ordem);
}
