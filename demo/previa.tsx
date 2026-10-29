/**
 * Offline preview of the artisan form, bundled into a single HTML page (npm run previa).
 * Nothing leaves the browser: API calls are answered here and photos stay as local blob URLs.
 */
import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Formulario from '@/components/Formulario';
import { Dados, Foto, dadosVazios, progresso } from '@/lib/types';

const fotos = new Map<string, string>();
let aoFinalizar = () => {};
const fetchOriginal = window.fetch.bind(window);

window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  if (!url.startsWith('/api/')) return fetchOriginal(entrada, init);
  await new Promise((r) => setTimeout(r, 250));
  if (url.endsWith('/foto') && init?.body instanceof FormData) {
    const arquivo = init.body.get('foto') as Blob;
    const id = `previa-${fotos.size + 1}-${Date.now()}`;
    fotos.set(id, URL.createObjectURL(arquivo));
    return Response.json({ path: id });
  }
  if (url.endsWith('/finalizar')) setTimeout(() => aoFinalizar(), 0);
  return Response.json({ ok: true });
};

const urlFoto = (f: Foto) => fotos.get(f.path) ?? '';

function Linha({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <div className="ficha-linha">
      <span className="discreto">{rotulo}</span>
      <span>{valor?.trim() ? valor : <em className="falta">não preenchido</em>}</span>
    </div>
  );
}

function Painel({ d, terminou }: { d: Dados; terminou: boolean }) {
  const p = progresso(d);
  return (
    <div className="painel">
      <header className="painel-topo">
        <div>
          <h1>{d.dominio.nomeAtelie || 'Ateliê de exemplo'}</h1>
          <p className="discreto">
            Maria (exemplo) · {terminou ? 'Terminou' : 'Enviando'} · {p.feitas}/{p.total} seções completas · {p.produtos} produtos
          </p>
        </div>
        <div className="linha">
          <button className="botao" disabled>
            Baixar PDF
          </button>
          <button className="botao secundario" disabled>
            Baixar fotos (.zip)
          </button>
        </div>
      </header>
      <div className="caixa-dica">
        É assim que você vê o envio de cada artesã. No sistema de verdade, os botões acima baixam o PDF com tudo e as fotos
        originais organizadas por categoria.
      </div>

      <section className="cartao">
        <h2>Catálogo</h2>
        {d.categorias.length === 0 && <p className="falta">Nenhuma categoria enviada.</p>}
        {d.categorias.map((c) => (
          <div key={c.id} className="ficha-categoria">
            <h3>
              {c.nome} <span className="discreto">· {c.produtos.length} produtos</span>
            </h3>
            {c.produtos.map((pr) => (
              <div key={pr.id} className="ficha-produto">
                <div className="fotos pequenas">
                  {pr.fotos.map((f) => (
                    <img key={f.path} src={urlFoto(f)} alt="" />
                  ))}
                </div>
                <div>
                  <strong>{pr.nome || 'Sem nome'}</strong>
                  {pr.temVariacoes ? (
                    <ul>
                      {pr.variacoes.map((v, i) => (
                        <li key={i}>
                          {v.tamanho}: R$ {v.valor}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      R$ {pr.valor || '—'} {pr.tamanho && `· ${pr.tamanho}`}
                    </p>
                  )}
                  {pr.obs && <p className="discreto">{pr.obs}</p>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="cartao">
        <h2>Página inicial</h2>
        <div className="ficha-grade">
          <div>
            <h3>Identidade visual</h3>
            {d.identidade.logo ? <img className="logo" src={urlFoto(d.identidade.logo)} alt="Logo" /> : <p className="falta">Sem logo</p>}
            <Linha rotulo="Cores" valor={d.identidade.cores} />
            <Linha rotulo="Tema" valor={d.identidade.tema === 'Outro' ? d.identidade.temaOutro : d.identidade.tema} />
          </div>
          <div>
            <h3>Sobre o ateliê</h3>
            {d.sobre.foto && <img className="logo" src={urlFoto(d.sobre.foto)} alt="Foto" />}
            <p className="texto-livre">{d.sobre.texto || <em className="falta">não preenchido</em>}</p>
          </div>
          <div>
            <h3>Pagamento e envio</h3>
            <Linha rotulo="Pagamento" valor={[...d.comercial.pagamentos, d.comercial.pagamentoOutro].filter(Boolean).join(', ')} />
            <Linha rotulo="Envio" valor={[...d.comercial.envios, d.comercial.envioOutro].filter(Boolean).join(', ')} />
            <Linha rotulo="Taxa local" valor={d.comercial.taxaLocal} />
          </div>
          <div>
            <h3>Links</h3>
            <Linha rotulo="WhatsApp" valor={d.links.whatsapp} />
            <Linha rotulo="Instagram" valor={d.links.instagram} />
            <Linha rotulo="Facebook" valor={d.links.facebook} />
            <Linha rotulo="Shopee" valor={d.links.shopee} />
          </div>
        </div>
        <h3>Depoimentos</h3>
        {d.depoimentos.length === 0 && <p className="discreto">Nenhum.</p>}
        {d.depoimentos.map((dep) => (
          <blockquote key={dep.id}>
            {dep.texto}
            {dep.print && <img className="logo" src={urlFoto(dep.print)} alt="Print" />}
            <footer>{dep.nome}</footer>
          </blockquote>
        ))}
      </section>

      <section className="cartao">
        <h2>Domínio e Canva</h2>
        <div className="ficha-grade">
          <div>
            <Linha rotulo="Autorizou uso dos dados" valor={d.dominio.consentimento ? 'Sim' : ''} />
            <Linha rotulo="Nome completo" valor={d.dominio.nomeCompleto} />
            <Linha rotulo="Nascimento" valor={d.dominio.nascimento.split('-').reverse().join('/')} />
            <Linha rotulo="CPF" valor={d.dominio.cpf} />
            <Linha rotulo="CNPJ" valor={d.dominio.cnpj || 'não tem'} />
            <Linha rotulo="Endereço" valor={d.dominio.endereco} />
          </div>
          <div>
            <Linha rotulo="Telefone" valor={d.dominio.telefone} />
            <Linha rotulo="E-mail" valor={d.dominio.email} />
            <Linha rotulo="Endereço do site" valor={d.dominio.enderecoSite} />
            <Linha rotulo="Canva Pro" valor={d.canva.naoTenho ? 'Ainda não tem' : d.canva.email} />
          </div>
        </div>
      </section>
    </div>
  );
}

function Previa() {
  const [visao, setVisao] = useState<'artesa' | 'painel'>('artesa');
  const [dados, setDados] = useState<Dados>(() => dadosVazios('Ateliê de exemplo'));
  const [rodada, setRodada] = useState(0);
  const [terminou, setTerminou] = useState(false);
  const aoMudar = useCallback((d: Dados) => setDados(d), []);

  useEffect(() => {
    aoFinalizar = () => setTerminou(true);
  }, []);

  return (
    <>
      <div className="previa-barra">
        <p>
          <strong>Prévia do sistema.</strong> Preencha à vontade: nada é enviado nem salvo.
        </p>
        <div className="previa-abas" role="tablist">
          <button role="tab" aria-selected={visao === 'artesa'} className={visao === 'artesa' ? 'ativa' : ''} onClick={() => setVisao('artesa')}>
            Visão da artesã
          </button>
          <button role="tab" aria-selected={visao === 'painel'} className={visao === 'painel' ? 'ativa' : ''} onClick={() => setVisao('painel')}>
            Como você recebe
          </button>
        </div>
      </div>
      {visao === 'artesa' ? (
        <>
          <Formulario
            key={rodada}
            token="previa-0000000000000000"
            nome="Maria (exemplo)"
            atelie={dados.dominio.nomeAtelie || 'Ateliê de exemplo'}
            dadosIniciais={dados}
            finalizado={terminou}
            urlFoto={urlFoto}
            aoMudar={aoMudar}
          />
          {terminou && (
            <div className="previa-fim">
              <button className="botao" onClick={() => setVisao('painel')}>
                Ver como você recebe →
              </button>
              <button
                className="botao secundario"
                onClick={() => {
                  setTerminou(false);
                  setRodada((n) => n + 1);
                }}
              >
                Voltar a editar
              </button>
            </div>
          )}
        </>
      ) : (
        <Painel d={dados} terminou={terminou} />
      )}
    </>
  );
}

createRoot(document.getElementById('app')!).render(<Previa />);
