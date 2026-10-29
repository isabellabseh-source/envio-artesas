'use client';

import { useRouter } from 'next/navigation';
import { STATUS_LABEL, Status } from '@/lib/types';

export default function AcoesArtesa({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const enviar = async (corpo: object) => {
    const r = await fetch(`/api/admin/artesas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    if (!r.ok) alert('Não deu certo.');
    router.refresh();
  };

  return (
    <>
      <select value={status} onChange={(e) => enviar({ acao: 'status', status: e.target.value })} aria-label="Status">
        {Object.entries(STATUS_LABEL).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {status !== 'enviando' && status !== 'nao_comecou' && (
        <button className="botao secundario pequeno" onClick={() => enviar({ acao: 'reabrir' })}>
          Reabrir envio
        </button>
      )}
      <button
        className="botao-texto"
        onClick={() => {
          if (confirm('Gerar um link novo? O link antigo para de funcionar.')) enviar({ acao: 'novo_link' });
        }}
      >
        Gerar link novo
      </button>
    </>
  );
}
