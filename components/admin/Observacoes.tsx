'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, avisar } from './cliente';

/** Quick notes field that saves without opening the full edit form. */
export default function Observacoes({ url, campo, inicial, rotulo }: { url: string; campo: string; inicial: string; rotulo: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);
  const mudou = texto !== inicial;
  return (
    <div className="pilha-pequena">
      <label className="rotulo" htmlFor={`obs-${campo}`}>
        {rotulo}
      </label>
      <textarea id={`obs-${campo}`} rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
      {mudou && (
        <button
          type="button"
          className="botao pequeno"
          style={{ alignSelf: 'flex-start' }}
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true);
            try {
              await api(url, 'PATCH', { [campo]: texto });
              avisar('Salvo');
              router.refresh();
            } catch (err) {
              avisar((err as Error).message);
            }
            setOcupado(false);
          }}
        >
          {ocupado ? 'Salvando…' : 'Salvar'}
        </button>
      )}
    </div>
  );
}
