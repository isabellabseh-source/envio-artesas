'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { enviarComProgresso, mb } from '@/lib/envio';
import { ArquivoEntregue, CATEGORIAS_ARQUIVO, CategoriaArquivo } from '@/lib/modelo';

const ARQUIVO_PAINEL_MB = 50;
const EXTENSOES_PAINEL = ['pdf', 'zip', 'rar', 'html', 'htm', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'json', 'mp4', 'mov'];
const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

/** Files Isa keeps with an order: the finished site, manuals, access details. */
export default function ArquivosEntregues({ id, arquivos, aoMudar }: { id: string; arquivos: ArquivoEntregue[]; aoMudar?: (a: ArquivoEntregue[]) => void }) {
  const [categoria, setCategoria] = useState<CategoriaArquivo>('site');
  const [pct, setPct] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const [apagando, setApagando] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [lista, setLista] = useState(arquivos);
  const mudar = (a: ArquivoEntregue[]) => {
    setLista(a);
    aoMudar?.(a);
    router.refresh();
  };

  const enviar = async (arq?: File) => {
    if (entrada.current) entrada.current.value = '';
    if (!arq) return;
    setErro('');
    if (arq.size > ARQUIVO_PAINEL_MB * 1024 * 1024) return setErro(`Este arquivo tem ${mb(arq.size)} e o limite é ${ARQUIVO_PAINEL_MB} MB.`);
    setPct(0);
    try {
      const base = `/api/admin/pedidos/${id}/arquivos`;
      const r = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: arq.name, tamanho: arq.size }),
      });
      if (r.status === 400) throw new Error('formato');
      if (r.status === 413) throw new Error('grande');
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
      mudar(((await ok.json()) as { arquivos: ArquivoEntregue[] }).arquivos);
    } catch (e) {
      setErro(
        e instanceof Error && e.message === 'formato'
          ? `Formato não aceito. Use: ${EXTENSOES_PAINEL.join(', ')}.`
          : e instanceof Error && e.message === 'grande'
          ? `O limite é ${ARQUIVO_PAINEL_MB} MB por arquivo.`
          : 'O arquivo não foi enviado. Confira a internet e tente de novo.',
      );
    }
    setPct(null);
  };

  const apagar = async (caminho: string) => {
    const r = await fetch(`/api/admin/pedidos/${id}/arquivos?path=${encodeURIComponent(caminho)}`, { method: 'DELETE' });
    setApagando(null);
    if (!r.ok) return setErro('Não foi possível apagar.');
    mudar(((await r.json()) as { arquivos: ArquivoEntregue[] }).arquivos);
  };

  return (
    <div className="pilha-curta">
      {lista.length > 0 && (
        <ul className="arquivos">
          {lista.map((a) => (
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
