import 'server-only';
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import sharp from 'sharp';
import { lerFoto } from './store';
import { Artesa, FOTOS_MIN, Foto, STATUS_LABEL, progresso } from './types';

const COR = '#b4654a';
const CINZA = '#6b6461';

const s = StyleSheet.create({
  pagina: { padding: 36, fontSize: 10, fontFamily: 'Helvetica', color: '#2b2523', lineHeight: 1.4 },
  capa: { padding: 48, justifyContent: 'center', alignItems: 'center', fontFamily: 'Helvetica' },
  capaLogo: { width: 160, height: 160, objectFit: 'contain', marginBottom: 24 },
  capaTitulo: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: COR, textAlign: 'center' },
  capaSub: { fontSize: 13, color: CINZA, marginTop: 8, textAlign: 'center' },
  etapa: { fontSize: 9, color: COR, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 2 },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 12 },
  h2: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: COR, marginTop: 14, marginBottom: 6 },
  linha: { flexDirection: 'row', marginBottom: 3 },
  rotulo: { width: 120, color: CINZA },
  valor: { flex: 1 },
  falta: { color: '#b23b3b' },
  produto: { flexDirection: 'row', borderBottom: '0.5pt solid #e5ddd8', paddingVertical: 8 },
  produtoInfo: { width: 170, paddingRight: 10 },
  produtoNome: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  produtoFotos: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  thumb: { width: 72, height: 72, objectFit: 'cover', borderRadius: 3 },
  fotoMedia: { width: 140, height: 140, objectFit: 'contain', marginBottom: 6 },
  depoimento: { borderLeft: `2pt solid ${COR}`, paddingLeft: 8, marginBottom: 8 },
  rodape: { position: 'absolute', bottom: 18, left: 36, right: 36, fontSize: 8, color: CINZA, flexDirection: 'row', justifyContent: 'space-between' },
});

type Img = { data: Buffer; format: 'jpg' | 'png' };

/** Loads every photo once, shrunk so the PDF stays light (full quality goes in the .zip). */
async function carregarFotos(fotos: Foto[], lado: number) {
  const mapa = new Map<string, Img>();
  const fila = [...new Set(fotos.map((f) => f.path))];
  const trabalhar = async () => {
    for (let p = fila.shift(); p; p = fila.shift()) {
      const original = await lerFoto(p);
      if (!original) continue;
      try {
        const png = p.endsWith('.png');
        const img = sharp(original).rotate().resize(lado, lado, { fit: 'inside', withoutEnlargement: true });
        const data = png ? await img.png().toBuffer() : await img.jpeg({ quality: 72 }).toBuffer();
        mapa.set(p, { data, format: png ? 'png' : 'jpg' });
      } catch {
        // A broken file just doesn't appear in the PDF.
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, trabalhar));
  return mapa;
}

function Campo({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <View style={s.linha}>
      <Text style={s.rotulo}>{rotulo}</Text>
      {valor?.trim() ? <Text style={s.valor}>{valor}</Text> : <Text style={[s.valor, s.falta]}>não preenchido</Text>}
    </View>
  );
}

export async function gerarPdf(a: Artesa): Promise<Buffer> {
  const d = a.dados;
  const todas: Foto[] = [
    ...d.categorias.flatMap((c) => c.produtos.flatMap((p) => p.fotos)),
    ...(d.identidade.inspiracoes ?? []),
    ...[d.identidade.logo, d.sobre.foto, ...d.depoimentos.map((x) => x.print)].filter((f): f is Foto => !!f),
  ];
  const fotos = await carregarFotos(todas, 600);
  const img = (f?: Foto) => (f ? fotos.get(f.path) : undefined);
  const prog = progresso(d);
  const enviadoEm = a.terminou_em
    ? new Date(a.terminou_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : 'envio ainda não finalizado';
  const titulo = a.atelie || a.nome;

  const Rodape = () => (
    <View style={s.rodape} fixed>
      <Text>{titulo}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );

  const logo = img(d.identidade.logo);
  const fotoSobre = img(d.sobre.foto);

  const doc = (
    <Document title={`Conteúdo do site - ${titulo}`} author="Envio de conteúdo">
      <Page size="A4" style={s.capa}>
        {logo && <Image style={s.capaLogo} src={logo} />}
        <Text style={s.capaTitulo}>{titulo}</Text>
        <Text style={s.capaSub}>Conteúdo para o site catálogo · {a.nome}</Text>
        <Text style={s.capaSub}>Enviado em {enviadoEm}</Text>
        <Text style={[s.capaSub, { marginTop: 24 }]}>
          {d.categorias.length} categorias · {prog.produtos} produtos · {prog.feitas}/{prog.total} seções completas ·{' '}
          {STATUS_LABEL[a.status]}
        </Text>
        {prog.secoes
          .filter((x) => !x.ok)
          .map((x) => (
            <Text key={x.id} style={[s.capaSub, s.falta, { fontSize: 10, marginTop: 2 }]}>
              Falta: {x.nome}
            </Text>
          ))}
      </Page>

      {d.categorias.map((c, i) => (
        <Page key={c.id} size="A4" style={s.pagina}>
          <Text style={s.etapa}>ETAPA 1 · CATÁLOGO · CATEGORIA {i + 1} DE {d.categorias.length}</Text>
          <Text style={s.h1}>
            {c.nome} ({c.produtos.length} produtos)
          </Text>
          {c.produtos.length === 0 && <Text style={s.falta}>Nenhum produto nesta categoria.</Text>}
          {c.produtos.map((p) => (
            <View key={p.id} style={s.produto} wrap={false}>
              <View style={s.produtoInfo}>
                <Text style={s.produtoNome}>{p.nome || 'Sem nome'}</Text>
                {p.temVariacoes ? (
                  p.variacoes.map((v, j) => (
                    <Text key={j}>
                      {v.tamanho}: R$ {v.valor}
                    </Text>
                  ))
                ) : (
                  <>
                    <Text>R$ {p.valor || '—'}</Text>
                    {p.tamanho && <Text style={{ color: CINZA }}>{p.tamanho}</Text>}
                  </>
                )}
                {p.obs && <Text style={{ color: CINZA, marginTop: 4 }}>{p.obs}</Text>}
                <Text style={[{ fontSize: 8, marginTop: 4 }, p.fotos.length < FOTOS_MIN ? s.falta : { color: CINZA }]}>
                  {p.fotos.length} fotos
                </Text>
              </View>
              <View style={s.produtoFotos}>
                {p.fotos.map((f) => {
                  const im = img(f);
                  return im ? <Image key={f.path} style={s.thumb} src={im} /> : null;
                })}
              </View>
            </View>
          ))}
          <Rodape />
        </Page>
      ))}
      <Page size="A4" style={s.pagina}>
        <Text style={s.etapa}>ETAPA 2</Text>
        <Text style={s.h1}>Página inicial</Text>

        <Text style={s.h2}>Identidade visual</Text>
        {logo && <Image style={s.fotoMedia} src={logo} />}
        <Campo rotulo="Cores" valor={d.identidade.cores} />
        <Campo rotulo="Tema" valor={d.identidade.tema === 'Outro' ? d.identidade.temaOutro : d.identidade.tema} />
        {!!d.identidade.inspiracoes?.length && (
          <View style={[s.linha, { gap: 6 }]}>
            <Text style={s.rotulo}>Inspirações</Text>
            {d.identidade.inspiracoes.map((f) => {
              const im = img(f);
              return im ? <Image key={f.path} style={s.fotoMedia} src={im} /> : null;
            })}
          </View>
        )}

        <Text style={s.h2}>Sobre o ateliê</Text>
        {fotoSobre && <Image style={s.fotoMedia} src={fotoSobre} />}
        {d.sobre.texto ? <Text>{d.sobre.texto}</Text> : <Text style={s.falta}>não preenchido</Text>}

        <Text style={s.h2}>Informações comerciais</Text>
        <Campo rotulo="Formas de pagamento" valor={[...d.comercial.pagamentos, d.comercial.pagamentoOutro].filter(Boolean).join(', ')} />
        <Campo rotulo="Formas de envio" valor={[...d.comercial.envios, d.comercial.envioOutro].filter(Boolean).join(', ')} />
        <Campo rotulo="Taxa de entrega local" valor={d.comercial.taxaLocal || 'não tem'} />

        <Text style={s.h2}>Links</Text>
        <Campo rotulo="WhatsApp" valor={d.links.whatsapp} />
        {d.links.instagram && <Campo rotulo="Instagram" valor={d.links.instagram} />}
        {d.links.facebook && <Campo rotulo="Facebook" valor={d.links.facebook} />}
        {d.links.shopee && <Campo rotulo="Shopee" valor={d.links.shopee} />}
        {d.links.outro && <Campo rotulo="Outro" valor={d.links.outro} />}

        <Text style={s.h2}>Depoimentos</Text>
        {d.depoimentos.length === 0 && <Text style={{ color: CINZA }}>Nenhum depoimento enviado.</Text>}
        {d.depoimentos.map((dep) => {
          const print = img(dep.print);
          return (
            <View key={dep.id} style={s.depoimento} wrap={false}>
              {dep.texto && <Text>“{dep.texto}”</Text>}
              {print && <Image style={s.fotoMedia} src={print} />}
              <Text style={{ color: CINZA }}>{dep.nome}</Text>
            </View>
          );
        })}
        <Rodape />
      </Page>

      <Page size="A4" style={s.pagina}>
        <Text style={s.etapa}>ETAPA 3</Text>
        <Text style={s.h1}>Domínio</Text>
        <Campo rotulo="Autorizou uso dos dados" valor={d.dominio.consentimento ? 'Sim' : ''} />
        <Campo rotulo="Nome completo" valor={d.dominio.nomeCompleto} />
        <Campo rotulo="Data de nascimento" valor={d.dominio.nascimento.split('-').reverse().join('/')} />
        <Campo rotulo="CPF" valor={d.dominio.cpf} />
        <Campo rotulo="CNPJ" valor={d.dominio.cnpj || 'não tem'} />
        <Campo rotulo="CEP" valor={d.dominio.cep} />
        <Campo rotulo="Endereço" valor={d.dominio.endereco} />
        <Campo rotulo="Telefone" valor={d.dominio.telefone} />
        <Campo rotulo="E-mail" valor={d.dominio.email} />
        <Campo rotulo="Nome do ateliê" valor={d.dominio.nomeAtelie} />
        <Campo rotulo="Endereço do site" valor={d.dominio.enderecoSite} />
        <Rodape />
      </Page>

    </Document>
  );

  return renderToBuffer(doc);
}
