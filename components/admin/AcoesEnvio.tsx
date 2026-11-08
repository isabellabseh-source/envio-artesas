'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StatusEnvio } from '@/lib/modelo';
import { api, avisar } from './cliente';

/** Reopen the form, replace the link, or free the photos' space once the site is delivered. */
export default function AcoesEnvio({ envioId, status, podeLiberar, liberado }: { envioId: string; status: StatusEnvio; podeLiberar: boolean; liberado: boolean }) {
  const router = useRouter();
  const [pergunta, setPergunta] = useState<'link' | 'liberar' | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const fazer = async (fn: () => Promise<unknown>, msg: string) => {
    setOcupado(true);
    try {
      await fn();
      avisar(msg);
      router.refresh();
    } catch (err) {
      avisar((err as Error).message);
    }
    setOcupado(false);
    setPergunta(null);
  };

  return (
    <div className="pilha-pequena">
      <div className="linha">
        {status === 'terminou' && (
          <button
            type="button"
            className="botao secundario pequeno"
            disabled={ocupado}
            onClick={() => fazer(() => api(`/api/admin/envios/${envioId}`, 'PATCH', { acao: 'reabrir' }), 'Envio reaberto: ela já pode mudar o conteúdo')}
          >
            Reabrir envio
          </button>
        )}
        <button type="button" className="botao-texto" onClick={() => setPergunta('link')}>
          Gerar link novo
        </button>
        {podeLiberar && !liberado && (
          <button type="button" className="botao-texto" onClick={() => setPergunta('liberar')}>
            Liberar espaço
          </button>
        )}
      </div>
      {pergunta === 'link' && (
        <div className="confirmar">
          <strong>Gerar um link novo?</strong>
          <span>O link atual para de funcionar na hora. O conteúdo já enviado continua salvo.</span>
          <div className="linha">
            <button
              type="button"
              className="botao pequeno"
              disabled={ocupado}
              onClick={() => fazer(() => api(`/api/admin/envios/${envioId}`, 'PATCH', { acao: 'novo_link' }), 'Link novo gerado')}
            >
              Sim, gerar
            </button>
            <button type="button" className="botao secundario pequeno" onClick={() => setPergunta(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {pergunta === 'liberar' && (
        <div className="confirmar">
          <strong>Apagar as fotos, vídeos e PDFs desta artesã da hospedagem?</strong>
          <span>
            Antes, baixe o .zip das fotos (botão acima) e guarde no computador ou no Google Drive. Textos, preços, dados do domínio e o histórico continuam
            no painel. Isso não pode ser desfeito.
          </span>
          <div className="linha">
            <button
              type="button"
              className="botao pequeno perigo"
              disabled={ocupado}
              onClick={() =>
                fazer(async () => {
                  const r = await api<{ bytes: number }>(`/api/admin/envios/${envioId}/liberar`, 'POST');
                  avisar(`${Math.round(r.bytes / 1024 / 1024)} MB liberados`);
                }, 'Espaço liberado')
              }
            >
              Sim, já baixei, pode apagar
            </button>
            <button type="button" className="botao secundario pequeno" onClick={() => setPergunta(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
