# Envio de conteúdo das artesãs

Sistema para cada artesã enviar o conteúdo do site catálogo (fotos, produtos, valores, categorias,
pagamento, envio, depoimentos, sobre nós, dados do domínio), seguindo o *Guia Site Catálogo*.

- **Artesã:** recebe um link pessoal pelo WhatsApp, sem cadastro nem senha. Preenche em etapas, no
  celular; tudo salva sozinho. No fim, aperta **“Terminei”**.
- **Painel (`/admin`):** lista de artesãs com o progresso, cadastro, botão para mandar o link no
  WhatsApp, ficha completa de cada uma, **PDF** com tudo e **.zip** com as fotos originais organizadas
  por categoria.

## Testar no computador (sem nenhuma conta)

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
cp .env.example .env.local   # e troque a senha
npm run dev
```

Abra http://localhost:3000/admin. Sem Supabase configurado, os dados e fotos ficam na pasta `.data`.

## Colocar no ar

1. **Supabase** (grátis): crie um projeto em https://supabase.com. Em *SQL Editor*, cole e rode o
   arquivo [`supabase/schema.sql`](supabase/schema.sql). Em *Project Settings → API*, copie a
   *Project URL* e a chave *service_role*.
2. **Netlify** (grátis, permite uso comercial): em https://app.netlify.com entre com o GitHub,
   clique em *Add new site → Import an existing project*, escolha este repositório e, antes de publicar,
   abra *Environment variables* e preencha:

   | Variável | Valor |
   | --- | --- |
   | `ADMIN_PASSWORD` | a senha do seu painel |
   | `SUPABASE_URL` | Project URL do Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave secreta (secret / service_role) do Supabase — nunca compartilhe |
   | `RESEND_API_KEY`, `AVISO_EMAIL` | opcional: aviso por e-mail quando alguém termina |
   | `NEXT_PUBLIC_SITE_URL` | opcional: endereço fixo do sistema (sem isso, usa o endereço em que o painel foi aberto) |
   | `SESSION_SECRET` | opcional: segredo do login do painel (sem isso, usa a chave secreta do Supabase) |

3. Clique em *Deploy*. Para usar um endereço próprio, adicione o domínio em *Domain management*.

O plano grátis da Netlify inclui 100 GB de tráfego e 125 mil chamadas de funções por mês. Se passar
disso, o site fica suspenso até o mês seguinte, a não ser que você mude para um plano pago.

## Como funciona por dentro

- Next.js (App Router). Todo acesso a dados passa pelo servidor (`lib/store.ts`), com a chave secreta do
  Supabase; a artesã só acessa o próprio envio pelo token do link.
- Fotos são reduzidas no celular antes do envio (máx. 1600 px) e guardadas no bucket privado `fotos`.
- PDF gerado com `@react-pdf/renderer` (fotos reduzidas para ficar leve); fotos originais no .zip.
- Endereço preenchido pelo CEP via [ViaCEP](https://viacep.com.br).
