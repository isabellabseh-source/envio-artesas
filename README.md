# Painel Isa Barros

Sistema de gestão do ateliê de sites: artesãs, pedidos, agenda, financeiro e o envio de conteúdo
pelas artesãs, tudo num lugar só.

- **Painel (`/admin`)**: Dashboard com indicadores e alertas, Artesãs (cadastro e histórico), Pedidos,
  Agenda (vagas por mês), Envio de conteúdo, Financeiro e Configurações. Exporta CSV, baixa backup,
  tem lixeira de 30 dias.
- **Artesã (`/a/<link>`)**: recebe um link por pedido pelo WhatsApp, sem cadastro nem senha. Preenche
  em etapas, no celular; tudo salva sozinho. No fim, aperta **“Terminei”**. O pedido muda sozinho para
  “Enviando conteúdo” e “Conteúdo enviado” (só se ainda estiver numa dessas etapas).
- **PDF** com todo o conteúdo e **.zip** com as fotos originais, como no sistema antigo.

## Testar no computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
cp .env.example .env.local   # preencha ADMIN_EMAIL, ADMIN_PASSWORD e SESSION_SECRET
npm run dev
```

Abra http://localhost:3000/admin. Sem MySQL configurado, os dados e fotos ficam na pasta `.data`.

## Colocar no ar na Hostinger (plano Web Hosting com Node.js)

1. **Banco de dados**: no hPanel, abra *Bancos de dados → Gerenciamento* e crie um banco MySQL.
   Anote o nome do banco, o usuário e a senha. (A tabela é criada sozinha no primeiro acesso.)
2. **App Node.js**: em *Sites → Adicionar site → App web em Node.js*, importe do GitHub este
   repositório. Use o subdomínio `painel.artesaonline.com.br`.
   - Comando de build: `npm run build` · Comando de início: `npm start` · Node.js 20 ou 22
3. **Variáveis de ambiente** (na tela do app, antes de publicar):

   | Variável | Valor |
   | --- | --- |
   | `ADMIN_EMAIL` | seu e-mail de login |
   | `ADMIN_PASSWORD` | sua senha (no primeiro acesso, ela cria a sua conta) |
   | `SESSION_SECRET` | um texto longo e aleatório, com 16 caracteres ou mais |
   | `NEXT_PUBLIC_SITE_URL` | `https://painel.artesaonline.com.br` |
   | `MYSQL_HOST` | `localhost` (ou o host mostrado no hPanel) |
   | `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | os dados do passo 1 |
   | `LIMITE_ESPACO_GB` | opcional: o espaço do plano, para a barra de uso (padrão 50) |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | só para trazer os dados antigos (veja abaixo) |
   | `RESEND_API_KEY`, `AVISO_EMAIL` | opcional: aviso por e-mail quando uma artesã termina |

   As fotos ficam em `~/dados-painel-isa/arquivos`, **fora** da pasta do app, para não sumirem quando
   o app é publicado de novo. Para outro lugar, defina `PASTA_ARQUIVOS`.
4. Publique e entre em `https://painel.artesaonline.com.br/admin` com o e-mail e a senha.

**Esqueceu a senha?** Troque `ADMIN_PASSWORD` nas variáveis da Hostinger, reinicie o app e entre com
a nova. Ela substitui a antiga.

## Trazer os dados do sistema antigo (Supabase)

1. Com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (as mesmas da Netlify) nas variáveis da Hostinger,
   abra **Configurações → Trazer do sistema antigo** e clique no botão.
2. Cada artesã antiga vira uma artesã + um pedido + o conteúdo, **com o mesmo link**. As fotos, vídeos
   e PDFs são copiados para a Hostinger. A agenda antiga (valor, previsão, notas, arquivos entregues)
   entra no pedido. Itens da agenda “fora do sistema” viram pedidos sem link (dá para criar o link
   depois, na aba Conteúdo).
3. O sistema antigo **não é alterado**. Pode clicar de novo quantas vezes quiser: o que já veio é
   pulado (útil para pegar o que as artesãs enviaram enquanto você fazia a mudança).
4. Confira os pagamentos: a agenda antiga só dizia “Sinal pago” ou “Pago”. “Pago” vira um pagamento
   do valor total (sem forma de pagamento); “Sinal pago” vira um lembrete nas observações financeiras.

## A virada (links antigos continuam funcionando)

Quando tudo estiver conferido na Hostinger:

1. Clique de novo em **Trazer do sistema antigo**, para pegar os últimos envios.
2. Junte este ramo ao `main` no GitHub. A Netlify publica o `main` sozinha e, com o `netlify.toml` novo,
   passa a só redirecionar: qualquer endereço antigo (`/a/...` de cada artesã, `/admin`) vai para o
   mesmo caminho em `painel.artesaonline.com.br`.
3. Depois de alguns meses, se quiser, pode desativar o projeto no Supabase.

## Como funciona por dentro

- Next.js (App Router), rodando como app Node.js. Todo acesso a dados passa pelo servidor.
- Dados numa tabela MySQL `registros` (documentos JSON por coleção: clientes, pedidos, envios,
  config, usuarios, historico), em `lib/db.ts`. Regras do negócio em `lib/negocio.ts`; cálculos e
  listas em `lib/modelo.ts`. Valores guardados em centavos.
- Arquivos no disco (`lib/arquivos.ts`); a artesã só acessa os arquivos do próprio link.
- Login com e-mail e senha (hash scrypt), sessão assinada; trocar a senha desconecta os outros aparelhos.
- Fotos reduzidas no celular antes do envio (máx. 1600 px); vídeos até 30 MB.
- PDF com `@react-pdf/renderer`; .zip montado no navegador. CEP pelo [ViaCEP](https://viacep.com.br).
