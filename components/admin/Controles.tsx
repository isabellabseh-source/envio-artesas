'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SITUACOES, Situacao } from '@/lib/modelo';
import { api, avisar } from './cliente';

/** Order status, changeable from any list. */
export function SeletorSituacao({ pedidoId, situacao }: { pedidoId: string; situacao: Situacao }) {
  const router = useRouter();
  const [valor, setValor] = useState(situacao);
  return (
    <select
      className={`sel-situacao s-${valor}`}
      aria-label="Situação do pedido"
      value={valor}
      onClick={(e) => e.stopPropagation()}
      onChange={async (e) => {
        const novo = e.target.value as Situacao;
        const antes = valor;
        setValor(novo);
        try {
          await api(`/api/admin/pedidos/${pedidoId}`, 'PATCH', { situacao: novo });
          avisar(`Situação: ${SITUACOES[novo]}`);
          router.refresh();
        } catch (err) {
          setValor(antes);
          avisar((err as Error).message);
        }
      }}
    >
      {Object.entries(SITUACOES).map(([k, t]) => (
        <option key={k} value={k}>
          {t}
        </option>
      ))}
    </select>
  );
}

/** Delete with an in-page confirmation (nothing is removed without a second click). */
export function BotaoExcluir({ url, rotulo, pergunta, explicacao, depois }: { url: string; rotulo: string; pergunta: string; explicacao: string; depois: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  if (!aberto) {
    return (
      <button type="button" className="botao-texto perigo" onClick={() => setAberto(true)}>
        {rotulo}
      </button>
    );
  }
  return (
    <div className="confirmar" role="alertdialog" aria-label={pergunta}>
      <strong>{pergunta}</strong>
      <span>{explicacao}</span>
      <div className="linha">
        <button
          type="button"
          className="botao pequeno perigo"
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true);
            try {
              await api(url, 'DELETE');
              avisar('Enviado para a lixeira');
              router.push(depois);
              router.refresh();
            } catch (err) {
              avisar((err as Error).message);
              setOcupado(false);
            }
          }}
        >
          Sim, excluir
        </button>
        <button type="button" className="botao secundario pequeno" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function BotaoCopiar({ texto, rotulo = 'Copiar link' }: { texto: string; rotulo?: string }) {
  return (
    <button
      type="button"
      className="botao secundario pequeno"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          avisar('Link copiado');
        } catch {
          window.prompt('Copie o link:', texto);
        }
      }}
    >
      {rotulo}
    </button>
  );
}

/** Selects that apply as soon as they change (filters on report pages). */
export function FiltroAuto({ children }: { children: React.ReactNode }) {
  return (
    <form
      className="filtros"
      method="get"
      onChange={(e) => {
        (e.currentTarget as HTMLFormElement).requestSubmit();
      }}
    >
      {children}
    </form>
  );
}

/** For orders with no content link yet (brought from the old agenda). */
export function CriarLink({ pedidoId }: { pedidoId: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      type="button"
      className="botao"
      style={{ alignSelf: 'flex-start' }}
      disabled={ocupado}
      onClick={async () => {
        setOcupado(true);
        try {
          await api(`/api/admin/pedidos/${pedidoId}/envio`, 'POST');
          avisar('Link criado');
          router.refresh();
        } catch (err) {
          avisar((err as Error).message);
        }
        setOcupado(false);
      }}
    >
      Criar link de envio
    </button>
  );
}
