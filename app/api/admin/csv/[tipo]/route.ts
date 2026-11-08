import { rota, naoEncontrado } from '@/lib/api';
import { carregarPainel } from '@/lib/negocio';
import { SITUACOES, SITUACOES_FIN, STATUS_ENVIO, centavosParaTexto, dataBr, hoje, mesBr, pago, saldo, situacaoFin, total } from '@/lib/modelo';

type Ctx = { params: Promise<{ tipo: string }> };

/** Spreadsheet-ready reports (Excel in Portuguese opens ";" separated files with accents correctly). */
function csv(cabecalho: string[], linhas: (string | number)[][]) {
  const cel = (v: string | number) => {
    const t = String(v ?? '');
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return '﻿' + [cabecalho, ...linhas].map((l) => l.map(cel).join(';')).join('\r\n');
}

export const GET = rota<Ctx>(async (_req, { params }) => {
  const { tipo } = await params;
  const { linhas, clientes } = await carregarPainel();
  let conteudo: string;
  if (tipo === 'pedidos') {
    conteudo = csv(
      ['Artesã', 'Ateliê', 'WhatsApp', 'Tipo de site', 'Serviço', 'Adicionais', 'Mês agendado', 'Início previsto', 'Fim previsto', 'Entrega', 'Situação do pedido', 'Conteúdo', 'Conteúdo (%)', 'Valor contratado', 'Valor pago', 'Saldo', 'Situação financeira', 'Observações'],
      linhas.map(({ pedido: p, cliente: c, envio: e }) => [
        c.nome, c.atelie, c.whatsapp, p.tipoSite, p.servico, p.adicionais.join(', '), p.mes ? mesBr(p.mes) : '', dataBr(p.inicio), dataBr(p.fim), dataBr(p.entrega),
        SITUACOES[p.situacao], e ? STATUS_ENVIO[e.status] : '', e?.pct ?? 0, centavosParaTexto(total(p)), centavosParaTexto(pago(p)), centavosParaTexto(saldo(p)), SITUACOES_FIN[situacaoFin(p)], p.obs,
      ]),
    );
  } else if (tipo === 'pagamentos') {
    conteudo = csv(
      ['Data', 'Artesã', 'Ateliê', 'Serviço', 'Forma', 'Valor', 'Observação'],
      linhas
        .flatMap(({ pedido: p, cliente: c }) => p.pagamentos.map((x) => ({ x, p, c })))
        .sort((a, b) => b.x.data.localeCompare(a.x.data))
        .map(({ x, p, c }) => [dataBr(x.data), c.nome, c.atelie, p.servico, x.forma, centavosParaTexto(x.valor), x.obs]),
    );
  } else if (tipo === 'artesas') {
    conteudo = csv(
      ['Nome', 'Ateliê', 'WhatsApp', 'Instagram', 'E-mail', 'Data da contratação', 'Pedidos', 'Total contratado', 'Total pago', 'Saldo', 'Observações'],
      clientes.map((c) => {
        const ps = linhas.filter((l) => l.cliente.id === c.id).map((l) => l.pedido);
        return [c.nome, c.atelie, c.whatsapp, c.instagram, c.email, dataBr(c.contratacao), ps.length,
          centavosParaTexto(ps.reduce((t, p) => t + total(p), 0)), centavosParaTexto(ps.reduce((t, p) => t + pago(p), 0)), centavosParaTexto(ps.reduce((t, p) => t + saldo(p), 0)), c.obs];
      }),
    );
  } else return naoEncontrado();
  return new Response(conteudo, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${tipo}-${hoje()}.csv"` },
  });
});
