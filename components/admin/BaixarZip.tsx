'use client';

import { useState } from 'react';

type Lista = { nomeZip: string; arquivos: { nome: string; url: string }[] };

/** Builds the photos .zip in the browser, fetching each photo straight from storage. */
export default function BaixarZip({ id }: { id: string }) {
  const [estado, setEstado] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  const baixar = async () => {
    setErro('');
    setEstado('Preparando…');
    try {
      const r = await fetch(`/api/admin/artesas/${id}/zip-lista`);
      if (!r.ok) throw new Error();
      const { nomeZip, arquivos } = (await r.json()) as Lista;
      if (!arquivos.length) {
        setEstado(null);
        return setErro('Ainda não tem fotos para baixar.');
      }
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      let feitos = 0;
      let falhas = 0;
      const fila = [...arquivos];
      const trabalhar = async () => {
        for (let item = fila.shift(); item; item = fila.shift()) {
          try {
            const resp = await fetch(item.url);
            if (!resp.ok) throw new Error();
            zip.file(item.nome, await resp.arrayBuffer());
          } catch {
            falhas++;
          }
          setEstado(`Baixando ${++feitos} de ${arquivos.length}…`);
        }
      };
      await Promise.all(Array.from({ length: 6 }, trabalhar));
      setEstado('Montando o .zip…');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = nomeZip;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
      if (falhas) setErro(`${falhas} ${falhas === 1 ? 'arquivo não veio' : 'arquivos não vieram'}. Tente baixar de novo.`);
    } catch {
      setErro('Não deu certo. Confira a internet e tente de novo.');
    }
    setEstado(null);
  };

  return (
    <span className="pilha-curta">
      <button type="button" className="botao secundario" disabled={!!estado} onClick={baixar}>
        {estado ?? 'Baixar fotos (.zip)'}
      </button>
      {erro && <span className="erro">{erro}</span>}
    </span>
  );
}
