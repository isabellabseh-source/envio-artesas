'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Categoria, Dados, ENVIOS, Foto, PAGAMENTOS, Produto, TEMAS, progresso } from '@/lib/types';
import { reduzirImagem } from '@/lib/imagem';

type Props = { token: string; nome: string; atelie: string; dadosIniciais: Dados; finalizado: boolean };

const ETAPAS = [
  { id: 'inicio', grupo: '', titulo: 'Boas-vindas' },
  { id: 'categorias', grupo: 'Etapa 1 · Catálogo', titulo: 'Categorias' },
  { id: 'produtos', grupo: 'Etapa 1 · Catálogo', titulo: 'Produtos' },
  { id: 'identidade', grupo: 'Etapa 2 · Página inicial', titulo: 'Identidade visual' },
  { id: 'sobre', grupo: 'Etapa 2 · Página inicial', titulo: 'Sobre o seu ateliê' },
  { id: 'comercial', grupo: 'Etapa 2 · Página inicial', titulo: 'Pagamento e envio' },
  { id: 'depoimentos', grupo: 'Etapa 2 · Página inicial', titulo: 'Depoimentos' },
  { id: 'links', grupo: 'Etapa 2 · Página inicial', titulo: 'Links' },
  { id: 'dominio', grupo: 'Etapa 3 · Domínio e Canva', titulo: 'Dados para o domínio' },
  { id: 'canva', grupo: 'Etapa 3 · Domínio e Canva', titulo: 'Canva' },
  { id: 'revisar', grupo: 'Final', titulo: 'Revisar e enviar' },
] as const;

const novoId = () => Math.random().toString(36).slice(2, 10);

const novoProduto = (): Produto => ({
  id: novoId(),
  nome: '',
  valor: '',
  tamanho: '',
  obs: '',
  temVariacoes: false,
  variacoes: [],
  fotos: [],
});

export default function Formulario({ token, nome, atelie, dadosIniciais, finalizado: finalizadoInicial }: Props) {
  const [dados, setDados] = useState<Dados>(dadosIniciais);
  const [etapa, setEtapa] = useState(0);
  const [salvo, setSalvo] = useState<'salvo' | 'salvando' | 'erro'>('salvo');
  const [finalizado, setFinalizado] = useState(finalizadoInicial);
  const [tentativa, setTentativa] = useState(0);
  const pendente = useRef(false);
  const primeiro = useRef(true);

  const fotoUrl = useCallback((f: Foto) => `/api/envio/${token}/foto/${f.path}`, [token]);

  /** Mutates a copy of the data; autosave picks it up. */
  const atualizar = useCallback((mudar: (d: Dados) => void) => {
    setDados((atual) => {
      const copia = structuredClone(atual);
      mudar(copia);
      return copia;
    });
  }, []);

  // Autosave 1.2s after the last change.
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    pendente.current = true;
    setSalvo('salvando');
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/envio/${token}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dados }),
        });
        if (!r.ok) throw new Error();
        pendente.current = false;
        setSalvo('salvo');
      } catch {
        setSalvo('erro');
        setTimeout(() => setTentativa((n) => n + 1), 5000);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [dados, token, tentativa]);

  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (pendente.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, []);

  const irPara = (i: number) => {
    setEtapa(i);
    window.scrollTo({ top: 0 });
  };

  if (finalizado) {
    return (
      <main className="centro">
        <div className="cartao texto-centro">
          <div className="emoji-grande">♡</div>
          <h1>Recebido, {nome.split(' ')[0]}!</h1>
          <p>Tudo o que você enviou chegou certinho. Agora é só aguardar o contato da Isa para agendar o seu site.</p>
          <p className="discreto">Se precisar mudar alguma coisa, fale com a Isa pelo WhatsApp que ela reabre o envio.</p>
        </div>
      </main>
    );
  }

  const atual = ETAPAS[etapa];
  const prog = progresso(dados);

  return (
    <div className="form-app">
      <header className="topo">
        <div className="topo-linha">
          <span className="topo-atelie">{atelie || nome}</span>
          <span className={`salvo salvo-${salvo}`}>
            {salvo === 'salvo' ? '✓ Salvo' : salvo === 'salvando' ? 'Salvando…' : 'Sem conexão, tentando de novo…'}
          </span>
        </div>
        <div className="barra">
          <div className="barra-cheia" style={{ width: `${(etapa / (ETAPAS.length - 1)) * 100}%` }} />
        </div>
      </header>

      <main className="conteudo">
        {atual.grupo && <p className="grupo">{atual.grupo}</p>}
        <h1>{atual.titulo}</h1>

        {atual.id === 'inicio' && (
          <div className="pilha">
            <p className="grande">Oi, {nome.split(' ')[0]}! Aqui você envia tudo o que eu preciso para criar o site do seu ateliê.</p>
            <ul className="lista-simples">
              <li>Tudo é salvo sozinho. Pode parar e voltar depois por este mesmo link.</li>
              <li>Dica: envie 2 categorias por dia, ao longo da semana. Fica mais leve!</li>
              <li>Quando terminar tudo, aperte <strong>“Terminei”</strong> na última tela.</li>
            </ul>
            <div className="caixa-aviso">Guarde este link: salve nos favoritos ou deixe fixada a nossa conversa no WhatsApp.</div>
          </div>
        )}

        {atual.id === 'categorias' && <EtapaCategorias dados={dados} atualizar={atualizar} />}
        {atual.id === 'produtos' && (
          <EtapaProdutos dados={dados} atualizar={atualizar} token={token} fotoUrl={fotoUrl} voltarCategorias={() => irPara(1)} />
        )}

        {atual.id === 'identidade' && (
          <div className="pilha">
            <Campo rotulo="Sua logo">
              <EnvioFotos
                token={token}
                fotoUrl={fotoUrl}
                fotos={dados.identidade.logo ? [dados.identidade.logo] : []}
                max={1}
                manterPng
                aoMudar={(f) => atualizar((d) => void (d.identidade.logo = f[0]))}
                texto="Enviar logo"
              />
            </Campo>
            <Campo rotulo="Cores do site" ajuda="Ex.: rosa claro e dourado, ou tons de verde.">
              <input value={dados.identidade.cores} onChange={(e) => atualizar((d) => void (d.identidade.cores = e.target.value))} />
            </Campo>
            <Campo rotulo="Tema">
              <div className="opcoes">
                {TEMAS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`opcao ${dados.identidade.tema === t ? 'marcada' : ''}`}
                    onClick={() => atualizar((d) => void (d.identidade.tema = t))}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {dados.identidade.tema === 'Outro' && (
                <input
                  placeholder="Qual tema?"
                  value={dados.identidade.temaOutro}
                  onChange={(e) => atualizar((d) => void (d.identidade.temaOutro = e.target.value))}
                />
              )}
            </Campo>
          </div>
        )}

        {atual.id === 'sobre' && (
          <div className="pilha">
            <Campo rotulo="Conte um pouco da sua história" ajuda="Um texto curto: como começou, o que você faz, o que torna seu trabalho especial.">
              <textarea rows={8} value={dados.sobre.texto} onChange={(e) => atualizar((d) => void (d.sobre.texto = e.target.value))} />
            </Campo>
            <Campo rotulo="Uma foto sua (opcional)">
              <EnvioFotos
                token={token}
                fotoUrl={fotoUrl}
                fotos={dados.sobre.foto ? [dados.sobre.foto] : []}
                max={1}
                aoMudar={(f) => atualizar((d) => void (d.sobre.foto = f[0]))}
                texto="Enviar foto"
              />
            </Campo>
          </div>
        )}

        {atual.id === 'comercial' && (
          <div className="pilha">
            <Campo rotulo="Formas de pagamento" ajuda="Marque todas que você aceita.">
              <Marcadores
                opcoes={PAGAMENTOS}
                marcados={dados.comercial.pagamentos}
                aoMudar={(v) => atualizar((d) => void (d.comercial.pagamentos = v))}
              />
              <input
                placeholder="Outra forma ou detalhes (ex.: até 3x sem juros)"
                value={dados.comercial.pagamentoOutro}
                onChange={(e) => atualizar((d) => void (d.comercial.pagamentoOutro = e.target.value))}
              />
            </Campo>
            <Campo rotulo="Formas de envio">
              <Marcadores opcoes={ENVIOS} marcados={dados.comercial.envios} aoMudar={(v) => atualizar((d) => void (d.comercial.envios = v))} />
              <input
                placeholder="Outra forma ou detalhes"
                value={dados.comercial.envioOutro}
                onChange={(e) => atualizar((d) => void (d.comercial.envioOutro = e.target.value))}
              />
            </Campo>
            <Campo rotulo="Taxa de entrega local (se tiver)" ajuda="Ex.: R$10 dentro da cidade.">
              <input value={dados.comercial.taxaLocal} onChange={(e) => atualizar((d) => void (d.comercial.taxaLocal = e.target.value))} />
            </Campo>
          </div>
        )}

        {atual.id === 'depoimentos' && (
          <EtapaDepoimentos dados={dados} atualizar={atualizar} token={token} fotoUrl={fotoUrl} />
        )}

        {atual.id === 'links' && (
          <div className="pilha">
            <Campo rotulo="WhatsApp" ajuda="Com DDD.">
              <input inputMode="tel" value={dados.links.whatsapp} onChange={(e) => atualizar((d) => void (d.links.whatsapp = e.target.value))} />
            </Campo>
            <Campo rotulo="Instagram">
              <input placeholder="@seuateliê" value={dados.links.instagram} onChange={(e) => atualizar((d) => void (d.links.instagram = e.target.value))} />
            </Campo>
            <Campo rotulo="Facebook">
              <input value={dados.links.facebook} onChange={(e) => atualizar((d) => void (d.links.facebook = e.target.value))} />
            </Campo>
            <Campo rotulo="Shopee">
              <input value={dados.links.shopee} onChange={(e) => atualizar((d) => void (d.links.shopee = e.target.value))} />
            </Campo>
            <Campo rotulo="Outro link">
              <input value={dados.links.outro} onChange={(e) => atualizar((d) => void (d.links.outro = e.target.value))} />
            </Campo>
          </div>
        )}

        {atual.id === 'dominio' && <EtapaDominio dados={dados} atualizar={atualizar} />}

        {atual.id === 'canva' && (
          <div className="pilha">
            <p>Para eu montar as artes do seu site, preciso do e-mail da sua conta Canva Pro.</p>
            <Campo rotulo="E-mail da conta Canva Pro">
              <input
                type="email"
                inputMode="email"
                disabled={dados.canva.naoTenho}
                value={dados.canva.email}
                onChange={(e) => atualizar((d) => void (d.canva.email = e.target.value))}
              />
            </Campo>
            <label className="marcador">
              <input type="checkbox" checked={dados.canva.naoTenho} onChange={(e) => atualizar((d) => void (d.canva.naoTenho = e.target.checked))} />
              Ainda não tenho conta Canva Pro
            </label>
            {dados.canva.naoTenho && (
              <div className="caixa-aviso">Sem problema! Crie a conta em canva.com e assine o Pro. Depois volte aqui e coloque o e-mail.</div>
            )}
          </div>
        )}

        {atual.id === 'revisar' && (
          <div className="pilha">
            <p>Confira o que já está completo. Toque em um item para voltar nele.</p>
            <ul className="checklist">
              {prog.secoes.map((s) => {
                const indice = ETAPAS.findIndex((e) => e.id === s.id);
                return (
                  <li key={s.id}>
                    <button type="button" onClick={() => irPara(indice)} className={s.ok ? 'ok' : 'falta'}>
                      <span className="marca">{s.ok ? '✓' : '!'}</span>
                      {s.nome}
                      {s.id === 'produtos' && <span className="discreto"> · {prog.produtos} produtos</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {prog.feitas < prog.total && (
              <div className="caixa-aviso">
                Ainda faltam alguns itens. Você pode completar agora ou enviar assim mesmo, e a Isa te chama se precisar.
              </div>
            )}
            <BotaoTerminar token={token} pendente={salvo !== 'salvo'} aoTerminar={() => setFinalizado(true)} />
          </div>
        )}
      </main>

      <nav className="rodape">
        <button type="button" className="botao secundario" disabled={etapa === 0} onClick={() => irPara(etapa - 1)}>
          ← Voltar
        </button>
        {etapa < ETAPAS.length - 1 && (
          <button type="button" className="botao" onClick={() => irPara(etapa + 1)}>
            {etapa === 0 ? 'Começar' : 'Próxima'} →
          </button>
        )}
      </nav>
    </div>
  );
}

// ---------- pieces ----------

type Atualizar = (mudar: (d: Dados) => void) => void;

function Campo({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children: React.ReactNode }) {
  return (
    <div className="campo">
      <label className="rotulo">{rotulo}</label>
      {ajuda && <p className="ajuda">{ajuda}</p>}
      {children}
    </div>
  );
}

function Marcadores({ opcoes, marcados, aoMudar }: { opcoes: string[]; marcados: string[]; aoMudar: (v: string[]) => void }) {
  return (
    <div className="opcoes">
      {opcoes.map((o) => {
        const sim = marcados.includes(o);
        return (
          <button
            key={o}
            type="button"
            className={`opcao ${sim ? 'marcada' : ''}`}
            onClick={() => aoMudar(sim ? marcados.filter((m) => m !== o) : [...marcados, o])}
          >
            {sim ? '✓ ' : ''}
            {o}
          </button>
        );
      })}
    </div>
  );
}

function EtapaCategorias({ dados, atualizar }: { dados: Dados; atualizar: Atualizar }) {
  const [nova, setNova] = useState('');
  const adicionar = () => {
    const nomes = nova
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (!nomes.length) return;
    atualizar((d) => {
      for (const n of nomes) d.categorias.push({ id: novoId(), nome: n, produtos: [] });
    });
    setNova('');
  };
  return (
    <div className="pilha">
      <p>Quais são as categorias do seu catálogo? Ex.: bolsas, mochilas, kits.</p>
      <div className="linha">
        <input
          placeholder="Nome da categoria"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionar()}
        />
        <button type="button" className="botao" onClick={adicionar}>
          Adicionar
        </button>
      </div>
      {dados.categorias.length === 0 && <p className="discreto">Nenhuma categoria ainda.</p>}
      <ul className="lista-itens">
        {dados.categorias.map((c, i) => (
          <li key={c.id}>
            <input value={c.nome} onChange={(e) => atualizar((d) => void (d.categorias[i].nome = e.target.value))} />
            <span className="discreto">{c.produtos.length} produtos</span>
            <button
              type="button"
              className="botao-icone"
              aria-label={`Apagar ${c.nome}`}
              onClick={() => {
                if (c.produtos.length && !confirm(`Apagar a categoria "${c.nome}" e os ${c.produtos.length} produtos dela?`)) return;
                atualizar((d) => void d.categorias.splice(i, 1));
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EtapaProdutos({
  dados,
  atualizar,
  token,
  fotoUrl,
  voltarCategorias,
}: {
  dados: Dados;
  atualizar: Atualizar;
  token: string;
  fotoUrl: (f: Foto) => string;
  voltarCategorias: () => void;
}) {
  const [catId, setCatId] = useState(dados.categorias[0]?.id);
  const [aberto, setAberto] = useState<string | null>(null);
  const ci = dados.categorias.findIndex((c) => c.id === catId);
  const cat: Categoria | undefined = dados.categorias[ci];

  if (!dados.categorias.length) {
    return (
      <div className="pilha">
        <p>Primeiro cadastre as suas categorias.</p>
        <button type="button" className="botao" onClick={voltarCategorias}>
          Cadastrar categorias
        </button>
      </div>
    );
  }

  return (
    <div className="pilha">
      <div className="caixa-dica">De 4 a 6 fotos por produto (mínimo 2), sempre com o valor e o tamanho.</div>
      <div className="abas">
        {dados.categorias.map((c) => (
          <button key={c.id} type="button" className={`aba ${c.id === catId ? 'ativa' : ''}`} onClick={() => setCatId(c.id)}>
            {c.nome || 'Sem nome'} <span className="contador">{c.produtos.length}</span>
          </button>
        ))}
      </div>

      {cat && (
        <>
          {cat.produtos.map((p, pi) => {
            const atualizarP = (mudar: (p: Produto) => void) => atualizar((d) => mudar(d.categorias[ci].produtos[pi]));
            const expandido = aberto === p.id;
            return (
              <div key={p.id} className="produto">
                <button type="button" className="produto-cabeca" onClick={() => setAberto(expandido ? null : p.id)}>
                  {p.fotos[0] ? <img src={fotoUrl(p.fotos[0])} alt="" /> : <span className="sem-foto">sem foto</span>}
                  <span className="produto-resumo">
                    <strong>{p.nome || 'Produto sem nome'}</strong>
                    <span className="discreto">
                      {p.valor ? `R$ ${p.valor}` : p.temVariacoes ? `${p.variacoes.length} tamanhos` : 'sem valor'} · {p.fotos.length} fotos
                    </span>
                  </span>
                  <span>{expandido ? '▲' : '▼'}</span>
                </button>
                {expandido && (
                  <div className="produto-corpo pilha">
                    <Campo rotulo="Fotos" ajuda="Toque para escolher da galeria. Pode escolher várias de uma vez.">
                      <EnvioFotos token={token} fotoUrl={fotoUrl} fotos={p.fotos} max={6} aoMudar={(f) => atualizarP((x) => void (x.fotos = f))} />
                    </Campo>
                    <Campo rotulo="Nome do produto">
                      <input value={p.nome} onChange={(e) => atualizarP((x) => void (x.nome = e.target.value))} />
                    </Campo>
                    <label className="marcador">
                      <input
                        type="checkbox"
                        checked={p.temVariacoes}
                        onChange={(e) =>
                          atualizarP((x) => {
                            x.temVariacoes = e.target.checked;
                            if (x.temVariacoes && !x.variacoes.length) x.variacoes = [{ tamanho: '', valor: '' }];
                          })
                        }
                      />
                      Tem tamanhos diferentes, com valores diferentes
                    </label>
                    {!p.temVariacoes ? (
                      <div className="linha">
                        <Campo rotulo="Valor (R$)">
                          <input inputMode="decimal" placeholder="89,90" value={p.valor} onChange={(e) => atualizarP((x) => void (x.valor = e.target.value))} />
                        </Campo>
                        <Campo rotulo="Tamanho / medidas">
                          <input placeholder="30 x 20 cm" value={p.tamanho} onChange={(e) => atualizarP((x) => void (x.tamanho = e.target.value))} />
                        </Campo>
                      </div>
                    ) : (
                      <div className="pilha-pequena">
                        {p.variacoes.map((v, vi) => (
                          <div className="linha" key={vi}>
                            <input
                              placeholder="Tamanho (ex.: P, 20 cm)"
                              value={v.tamanho}
                              onChange={(e) => atualizarP((x) => void (x.variacoes[vi].tamanho = e.target.value))}
                            />
                            <input
                              inputMode="decimal"
                              placeholder="Valor"
                              value={v.valor}
                              onChange={(e) => atualizarP((x) => void (x.variacoes[vi].valor = e.target.value))}
                            />
                            <button type="button" className="botao-icone" onClick={() => atualizarP((x) => void x.variacoes.splice(vi, 1))}>
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="botao secundario pequeno"
                          onClick={() => atualizarP((x) => void x.variacoes.push({ tamanho: '', valor: '' }))}
                        >
                          + Adicionar tamanho
                        </button>
                      </div>
                    )}
                    <Campo rotulo="Observação (opcional)" ajuda="Cores disponíveis, material, prazo de produção…">
                      <textarea rows={2} value={p.obs} onChange={(e) => atualizarP((x) => void (x.obs = e.target.value))} />
                    </Campo>
                    <div className="linha entre">
                      <button
                        type="button"
                        className="botao-texto perigo"
                        onClick={() => {
                          if (confirm('Apagar este produto?')) atualizar((d) => void d.categorias[ci].produtos.splice(pi, 1));
                        }}
                      >
                        Apagar produto
                      </button>
                      <button type="button" className="botao secundario pequeno" onClick={() => setAberto(null)}>
                        Pronto
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <button
            type="button"
            className="botao largo"
            onClick={() => {
              const p = novoProduto();
              atualizar((d) => void d.categorias[ci].produtos.push(p));
              setAberto(p.id);
            }}
          >
            + Adicionar produto em {cat.nome || 'esta categoria'}
          </button>
        </>
      )}
    </div>
  );
}

function EtapaDepoimentos({ dados, atualizar, token, fotoUrl }: { dados: Dados; atualizar: Atualizar; token: string; fotoUrl: (f: Foto) => string }) {
  return (
    <div className="pilha">
      <p>Opcional: até 6 mensagens de clientes. Pode digitar o texto ou mandar o print da conversa.</p>
      {dados.depoimentos.map((dep, i) => (
        <div key={dep.id} className="produto produto-corpo pilha">
          <Campo rotulo="Nome da cliente">
            <input value={dep.nome} onChange={(e) => atualizar((d) => void (d.depoimentos[i].nome = e.target.value))} />
          </Campo>
          <Campo rotulo="O que ela disse">
            <textarea rows={3} value={dep.texto} onChange={(e) => atualizar((d) => void (d.depoimentos[i].texto = e.target.value))} />
          </Campo>
          <Campo rotulo="Ou o print da mensagem">
            <EnvioFotos
              token={token}
              fotoUrl={fotoUrl}
              fotos={dep.print ? [dep.print] : []}
              max={1}
              aoMudar={(f) => atualizar((d) => void (d.depoimentos[i].print = f[0]))}
              texto="Enviar print"
            />
          </Campo>
          <button type="button" className="botao-texto perigo" onClick={() => atualizar((d) => void d.depoimentos.splice(i, 1))}>
            Apagar depoimento
          </button>
        </div>
      ))}
      {dados.depoimentos.length < 6 && (
        <button
          type="button"
          className="botao largo"
          onClick={() => atualizar((d) => void d.depoimentos.push({ id: novoId(), nome: '', texto: '' }))}
        >
          + Adicionar depoimento
        </button>
      )}
    </div>
  );
}

function EtapaDominio({ dados, atualizar }: { dados: Dados; atualizar: Atualizar }) {
  const dom = dados.dominio;
  const set = (k: keyof Dados['dominio']) => (e: React.ChangeEvent<HTMLInputElement>) =>
    atualizar((d) => void ((d.dominio as Record<string, unknown>)[k] = e.target.value));

  const buscarCep = async () => {
    const cep = dom.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) return;
      atualizar((d) => {
        if (!d.dominio.endereco) d.dominio.endereco = `${j.logradouro}, nº , ${j.bairro}, ${j.localidade} - ${j.uf}`;
      });
    } catch {
      // the artisan can type the address by hand
    }
  };

  return (
    <div className="pilha">
      <div className="caixa-dica">O 1º ano do domínio já está incluso no pacote. Depois, a renovação é de R$40 por ano.</div>
      <label className="marcador destaque">
        <input type="checkbox" checked={dom.consentimento} onChange={(e) => atualizar((d) => void (d.dominio.consentimento = e.target.checked))} />
        Autorizo o uso destes dados somente para registrar o domínio do meu site.
      </label>
      <Campo rotulo="Nome completo">
        <input autoComplete="name" value={dom.nomeCompleto} onChange={set('nomeCompleto')} />
      </Campo>
      <div className="linha">
        <Campo rotulo="Data de nascimento">
          <input type="date" value={dom.nascimento} onChange={set('nascimento')} />
        </Campo>
        <Campo rotulo="CPF">
          <input inputMode="numeric" placeholder="000.000.000-00" value={dom.cpf} onChange={set('cpf')} />
        </Campo>
      </div>
      <Campo rotulo="CNPJ (se tiver)">
        <input inputMode="numeric" value={dom.cnpj} onChange={set('cnpj')} />
      </Campo>
      <Campo rotulo="CEP" ajuda="O endereço é preenchido sozinho. Depois complete com o número.">
        <input inputMode="numeric" autoComplete="postal-code" value={dom.cep} onChange={set('cep')} onBlur={buscarCep} />
      </Campo>
      <Campo rotulo="Endereço completo">
        <input autoComplete="street-address" value={dom.endereco} onChange={set('endereco')} />
      </Campo>
      <div className="linha">
        <Campo rotulo="Telefone">
          <input inputMode="tel" autoComplete="tel" value={dom.telefone} onChange={set('telefone')} />
        </Campo>
        <Campo rotulo="E-mail">
          <input type="email" inputMode="email" autoComplete="email" value={dom.email} onChange={set('email')} />
        </Campo>
      </div>
      <Campo rotulo="Nome do ateliê">
        <input value={dom.nomeAtelie} onChange={set('nomeAtelie')} />
      </Campo>
      <Campo rotulo="Endereço desejado do site" ajuda="Ex.: www.seunome.com.br. Se tiver mais de uma ideia, escreva as opções.">
        <input value={dom.enderecoSite} onChange={set('enderecoSite')} />
      </Campo>
      <p className="discreto">Na compra chegam alguns e-mails: vamos cadastrar juntas a senha do domínio no dia agendado do seu site.</p>
    </div>
  );
}

function EnvioFotos({
  token,
  fotoUrl,
  fotos,
  max,
  aoMudar,
  texto = 'Escolher fotos',
  manterPng = false,
}: {
  token: string;
  fotoUrl: (f: Foto) => string;
  fotos: Foto[];
  max: number;
  aoMudar: (f: Foto[]) => void;
  texto?: string;
  manterPng?: boolean;
}) {
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState('');
  const entrada = useRef<HTMLInputElement>(null);
  // Uploads finish one by one; keep the latest list so each one is appended, not lost.
  const atuais = useRef(fotos);
  atuais.current = fotos;

  const escolher = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    setErro('');
    const lista = Array.from(arquivos).slice(0, max === 1 ? 1 : Math.max(0, max - fotos.length));
    if (!lista.length) {
      setErro(`Máximo de ${max} fotos.`);
      return;
    }
    setEnviando(lista.length);
    for (const arq of lista) {
      try {
        const blob = await reduzirImagem(arq, manterPng);
        const corpo = new FormData();
        corpo.append('foto', blob, 'foto');
        const r = await fetch(`/api/envio/${token}/foto`, { method: 'POST', body: corpo });
        if (!r.ok) throw new Error();
        const { path } = await r.json();
        const nova = max === 1 ? [{ path }] : [...atuais.current, { path }];
        atuais.current = nova;
        aoMudar(nova);
      } catch {
        setErro('Uma foto não foi enviada. Confira a internet e tente de novo.');
      }
      setEnviando((n) => n - 1);
    }
    if (entrada.current) entrada.current.value = '';
  };

  return (
    <div>
      <div className="fotos">
        {fotos.map((f, i) => (
          <div key={f.path} className="foto">
            <img src={fotoUrl(f)} alt={`Foto ${i + 1}`} />
            <button
              type="button"
              className="foto-apagar"
              aria-label="Remover foto"
              onClick={() => aoMudar(fotos.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        {Array.from({ length: enviando }).map((_, i) => (
          <div key={`e${i}`} className="foto carregando">
            enviando…
          </div>
        ))}
        {(max === 1 || fotos.length + enviando < max) && (
          <button type="button" className="foto adicionar" onClick={() => entrada.current?.click()}>
            <span className="mais">+</span>
            {max === 1 && fotos.length ? 'Trocar' : texto}
          </button>
        )}
      </div>
      <input ref={entrada} type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => escolher(e.target.files)} />
      {max > 1 && (
        <p className="discreto">
          {fotos.length} de {max} fotos{fotos.length < 2 ? ' · mínimo 2' : ''}
        </p>
      )}
      {erro && <p className="erro">{erro}</p>}
    </div>
  );
}

function BotaoTerminar({ token, pendente, aoTerminar }: { token: string; pendente: boolean; aoTerminar: () => void }) {
  const [enviando, setEnviando] = useState(false);
  return (
    <button
      type="button"
      className="botao largo grande"
      disabled={enviando || pendente}
      onClick={async () => {
        if (!confirm('Enviar tudo para a Isa? Depois disso, para mudar algo é preciso pedir para ela reabrir.')) return;
        setEnviando(true);
        const r = await fetch(`/api/envio/${token}/finalizar`, { method: 'POST' });
        setEnviando(false);
        if (r.ok) aoTerminar();
        else alert('Não deu certo. Confira a internet e tente de novo.');
      }}
    >
      {pendente ? 'Salvando…' : enviando ? 'Enviando…' : 'Terminei, pode fazer meu site! ♡'}
    </button>
  );
}
