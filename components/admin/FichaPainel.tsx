'use client';

import { useRef, useState } from 'react';
import { enviarComProgresso, mb } from '@/lib/envio';
import {
  ARQUIVO_PAINEL_MB,
  ArquivoPainel,
  CATEGORIAS_ARQUIVO,
  CategoriaArquivo,
  EXTENSOES_PAINEL,
  Ficha,
  PAGAMENTO_STATUS,
  TIPOS_SITE,
} from '@/lib/types';

type Props = { id: string; inicial: Ficha; terminouEm: string | null };

const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

/** Isa's agenda card for one artisan: dates, payment, notes and the delivered files. */
export default function FichaPainel({ id, inicial, terminouEm }: Props) {
  const [ficha, setFicha] = useState(inicial);
  const [estado, setEstado] = useState<'salvo' | 'mudou' | 'salvando' | 'erro'>('salvo');
  const mudar = <K extends keyof Ficha>(campo: K, valor: Ficha[K]) => {
    setFicha((f) => ({ ...f, [campo]: valor }));
    setEstado('mudou');
  };

  const salvar = async () => {
    setEstado('salvando');
    const { arquivos: _, ...campos } = ficha;
    const r = await fetch(`/api/admin/artesas/${id}/ficha`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campos),
    });
    if (!r.ok) return setEstado('erro');
    const salva = (await r.json()) as Ficha;
    setFicha((f) => ({ ...salva, arquivos: f.arquivos }));
    setEstado('salvo');
  };

  return (
    <section className="cartao pilha">
      <h2>Agenda do site</h2>
      <p className="discreto">Só você vê esta parte.</p>

      <div className="ficha-campos">
        <label className="campo">
          <span className="rotulo">Tipo</span>
          <select value={ficha.tipo} onChange={(e) => mudar('tipo', e.target.value)}>
            <option value="">Escolha…</option>
            {TIPOS_SITE.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className="campo">
          <span className="rotulo">Terminou o envio</span>
          <span className="valor-fixo">{terminouEm ? dataBr(terminouEm) : 'ainda não terminou'}</span>
        </div>
        <label className="campo">
          <span className="rotulo">Previsão de entrega</span>
          <input type="date" value={ficha.previsao} onChange={(e) => mudar('previsao', e.target.value)} />
        </label>
        <label className="campo">
          <span className="rotulo">Entregue em</span>
          <input type="date" value={ficha.entregueEm} onChange={(e) => mudar('entregueEm', e.target.value)} />
        </label>
        <label className="campo">
          <span className="rotulo">Valor (R$)</span>
          <input inputMode="decimal" value={ficha.valor} onChange={(e) => mudar('valor', e.target.value)} />
        </label>
        <label className="campo">
          <span className="rotulo">Pagamento</span>
          <select value={ficha.pagamento} onChange={(e) => mudar('pagamento', e.target.value)}>
            {PAGAMENTO_STATUS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span className="rotulo">Endereço do site pronto</span>
          <input placeholder="www.ateliedamaria.com.br" value={ficha.enderecoSite} onChange={(e) => mudar('enderecoSite', e.target.value)} />
        </label>
        <label className="campo">
          <span className="rotulo">Renovação do domínio</span>
          <input type="date" value={ficha.renovacaoDominio} onChange={(e) => mudar('renovacaoDominio', e.target.value)} />
        </label>
      </div>
      <label className="campo">
        <span className="rotulo">Anotações</span>
        <textarea rows={4} placeholder="Pedidos da artesã, o que falta, combinados…" value={ficha.notas} onChange={(e) => mudar('notas', e.target.value)} />
      </label>
      <div className="linha">
        <button type="button" className="botao" disabled={estado === 'salvando' || estado === 'salvo'} onClick={salvar}>
          {estado === 'salvando' ? 'Salvando…' : estado === 'salvo' ? 'Salvo ✓' : 'Salvar agenda'}
        </button>
        {estado === 'erro' && <span className="erro">Não salvou. Tente de novo.</span>}
      </div>

      <h3>Arquivos do site entregue</h3>
      <p className="discreto">Guarde aqui o arquivo do site, o manual e os acessos. Se a artesã perder, você tem uma cópia.</p>
      <ArquivosEntregues id={id} arquivos={ficha.arquivos} aoMudar={(arquivos) => setFicha((f) => ({ ...f, arquivos }))} />
    </section>
  );
}

function ArquivosEntregues({ id, arquivos, aoMudar }: { id: string; arquivos: ArquivoPainel[]; aoMudar: (a: ArquivoPainel[]) => void }) {
  const [categoria, setCategoria] = useState<CategoriaArquivo>('site');
  const [pct, setPct] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const [apagando, setApagando] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const enviar = async (arq?: File) => {
    if (entrada.current) entrada.current.value = '';
    if (!arq) return;
    setErro('');
    if (arq.size > ARQUIVO_PAINEL_MB * 1024 * 1024) return setErro(`Este arquivo tem ${mb(arq.size)} e o limite é ${ARQUIVO_PAINEL_MB} MB.`);
    setPct(0);
    try {
      const base = `/api/admin/artesas/${id}/ficha/arquivos`;
      const r = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: arq.name, tamanho: arq.size }),
      });
      if (r.status === 400) throw new Error('formato');
      if (!r.ok) throw new Error();
      const { path, url } = (await r.json()) as { path: string; url: string | null };
      if (url) await enviarComProgresso(url, arq, setPct);
      else if (!(await fetch(`${base}?path=${encodeURIComponent(path)}`, { method: 'PUT', body: arq })).ok) throw new Error();
      const ok = await fetch(base, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, nome: arq.name, tamanho: arq.size, categoria }),
      });
      if (!ok.ok) throw new Error();
      aoMudar(((await ok.json()) as Ficha).arquivos);
    } catch (e) {
      setErro(
        e instanceof Error && e.message === 'formato'
          ? `Formato não aceito. Use: ${EXTENSOES_PAINEL.join(', ')}.`
          : 'O arquivo não foi enviado. Confira a internet e tente de novo.',
      );
    }
    setPct(null);
  };

  const apagar = async (caminho: string) => {
    const r = await fetch(`/api/admin/artesas/${id}/ficha/arquivos?path=${encodeURIComponent(caminho)}`, { method: 'DELETE' });
    setApagando(null);
    if (!r.ok) return setErro('Não foi possível apagar.');
    aoMudar(((await r.json()) as Ficha).arquivos);
  };

  return (
    <div className="pilha-curta">
      {arquivos.length > 0 && (
        <ul className="arquivos">
          {arquivos.map((a) => (
            <li key={a.path}>
              <span className="etiqueta">{CATEGORIAS_ARQUIVO[a.categoria]}</span>
              <a className="arquivo-nome" href={`/api/admin/painel-arquivo/${a.path}?nome=${encodeURIComponent(a.nome)}`}>
                {a.nome}
              </a>
              <span className="discreto">
                {mb(a.tamanho)} · {dataBr(a.enviadoEm)}
              </span>
              {apagando === a.path ? (
                <span className="linha">
                  <button type="button" className="botao-texto" onClick={() => setApagando(null)}>
                    Não
                  </button>
                  <button type="button" className="botao-texto perigo" onClick={() => apagar(a.path)}>
                    Apagar
                  </button>
                </span>
              ) : (
                <button type="button" className="botao-icone" aria-label={`Apagar ${a.nome}`} onClick={() => setApagando(a.path)}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {pct !== null ? (
        <div className="envio-progresso" role="status">
          <span style={{ width: `${pct}%` }} />
          <p>Enviando… {pct}%</p>
        </div>
      ) : (
        <div className="linha">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaArquivo)} aria-label="Tipo de arquivo">
            {Object.entries(CATEGORIAS_ARQUIVO).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button type="button" className="botao secundario pequeno" onClick={() => entrada.current?.click()}>
            + Guardar arquivo
          </button>
        </div>
      )}
      <input ref={entrada} type="file" hidden onChange={(e) => enviar(e.target.files?.[0])} />
      {erro && <p className="erro">{erro}</p>}
    </div>
  );
}
