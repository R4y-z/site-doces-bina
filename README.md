# Doces da Bina — Cardápio Digital & Delivery

Web app de cardápio digital / delivery para doceria, 100% rodando no ecossistema Cloudflare:

- **Front-end:** React + Vite + TypeScript + Tailwind CSS (mobile-first)
- **API:** [Hono](https://hono.dev) rodando como Cloudflare Pages Functions (runtime de Workers/edge)
- **Banco de dados:** Cloudflare D1 (SQLite serverless)
- **Imagens:** Cloudflare R2
- **Hospedagem:** Cloudflare Pages

## Estrutura do projeto

```
├── src/                      # Front-end (React SPA)
│   ├── components/           # Header, SearchBar, CategoryTabs, ProductCard,
│   │                         # ProductModal, CartDrawer, CheckoutForm, PixPanel...
│   ├── components/admin/     # ImageUploader (upload para R2)
│   ├── pages/                # Home (público) + pages/admin/* (painel)
│   ├── store/cart.ts          # Estado do carrinho (zustand + localStorage)
│   ├── lib/                  # api.ts (fetch wrapper), format.ts
│   └── types.ts              # Tipos compartilhados com a API
│
├── server/                   # Backend Hono (roda como Pages Functions)
│   ├── app.ts                 # App Hono principal, monta todas as rotas
│   ├── routes/                 # menu, auth, categories, products, orders,
│   │                           # settings, upload, images
│   ├── middleware/auth.ts      # Middleware requireAdmin (JWT via cookie)
│   └── lib/                    # password.ts (PBKDF2), jwt.ts (jose),
│                                # mappers.ts, whatsapp.ts, slug.ts
│
├── functions/api/[[route]].ts  # Entry point das Cloudflare Pages Functions
│                                # (delega tudo para o app Hono)
│
├── schema.sql                 # Schema do banco D1
├── seed.sql                   # Dados de exemplo (categorias/produtos demo)
├── wrangler.toml               # Config do Cloudflare Pages (bindings D1/R2)
└── .dev.vars.example            # Modelo de variáveis locais (JWT_SECRET etc.)
```

## Como funciona o checkout

1. Cliente monta o carrinho (persistido no `localStorage`).
2. No checkout, preenche nome, telefone, tipo de entrega (retirada/entrega) e
   forma de pagamento (PIX / cartão ou dinheiro na entrega, com campo de troco).
3. `POST /api/orders` **recalcula os preços no servidor** (nunca confia no
   valor enviado pelo navegador), grava o pedido no D1 e devolve um link
   `wa.me` com o resumo do pedido já formatado.
4. O cliente confirma e é redirecionado ao WhatsApp da loja para finalizar.

## Painel administrativo (`/admin`)

- Login com usuário/senha (hash PBKDF2 via Web Crypto — sem dependências
  nativas, 100% compatível com o runtime de Workers) e sessão em cookie
  `HttpOnly` assinado com JWT (`jose`).
- CRUD completo de categorias e produtos, incluindo grupos de
  acompanhamentos/adicionais (obrigatórios ou opcionais, múltipla escolha).
- Upload de imagens (produtos, logo, banner, QR code do PIX) direto para R2.
- Gestão de pedidos em tempo real (atualização de status).
- Configurações da loja: abrir/fechar, endereço, horários, WhatsApp, taxa de
  entrega, pedido mínimo, chave PIX e QR code.

---

## Passo a passo — rodando localmente

### 1. Pré-requisitos

- Node.js 18+
- Uma conta Cloudflare (gratuita) — necessária apenas para o deploy final; o
  desenvolvimento local funciona sem login.

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis locais

```bash
cp .dev.vars.example .dev.vars
```

Edite `.dev.vars` e gere valores aleatórios para `JWT_SECRET` e
`ADMIN_SETUP_KEY` (ex: `openssl rand -base64 48`). Esse arquivo é local e já
está no `.gitignore`.

### 4. Criar o banco D1 local e aplicar o schema

Não é preciso estar logado no Cloudflare para isso — o `--local` roda tudo
em um SQLite simulado na sua máquina:

```bash
npm run db:migrate:local
npm run db:seed:local     # opcional: dados de demonstração
```

### 5. Build + subir tudo junto (front-end + API + D1 + R2 simulados)

```bash
npm run build
npm run pages:dev
```

Acesse `http://127.0.0.1:8788`. O cardápio já deve aparecer com os dados do
`seed.sql`.

> Durante o desenvolvimento do front-end isoladamente você também pode rodar
> `npm run dev` (Vite puro, com hot-reload) — nesse modo as chamadas a
> `/api/*` são redirecionadas via proxy para `http://127.0.0.1:8788`, então
> rode o `pages:dev` em paralelo se quiser testar a API junto.

### 6. Criar o primeiro usuário admin

Com o servidor local rodando, chame o endpoint de setup uma única vez
(substitua pelos valores do seu `.dev.vars`):

```bash
curl -X POST http://127.0.0.1:8788/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sua-senha-forte","setupKey":"SUA_ADMIN_SETUP_KEY"}'
```

Esse endpoint só funciona **uma vez** (enquanto não existir nenhum admin
cadastrado). Depois disso, acesse `http://127.0.0.1:8788/admin/login`.

---

## Passo a passo — deploy em produção (Cloudflare)

### 1. Login no Wrangler

```bash
npx wrangler login
```

### 2. Criar o banco D1 remoto

```bash
npm run db:create
```

Copie o `database_id` retornado e cole em `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "doceria-db"
database_id = "COLE_AQUI_O_ID_RETORNADO"
```

### 3. Aplicar o schema no banco remoto

```bash
npm run db:migrate:remote
npm run db:seed:remote     # opcional
```

### 4. Criar o bucket R2 para as imagens

```bash
npx wrangler r2 bucket create doceria-imagens
```

(Opcional, recomendado em produção: em **Cloudflare Dashboard → R2 → seu
bucket → Settings → Public Access**, vincule um domínio/subdomínio público ao
bucket. Isso permite servir as imagens direto do R2, sem passar pelo Worker —
mais rápido e mais barato. A rota `GET /api/images/:key` já incluída no
projeto funciona sem essa configuração, então isso é apenas uma otimização.)

### 5. Criar o projeto Pages e configurar os segredos

```bash
npx wrangler pages project create doceria-cardapio-digital
npx wrangler pages secret put JWT_SECRET
npx wrangler pages secret put ADMIN_SETUP_KEY
```

### 6. Build e deploy

```bash
npm run pages:deploy
```

O Wrangler vai publicar o conteúdo de `dist/` (front-end) junto com as
Functions em `functions/api/`, já conectadas aos bindings `DB` e `IMAGES`
declarados em `wrangler.toml`.

### 7. Criar o admin em produção

Mesmo comando do passo local, trocando a URL:

```bash
curl -X POST https://SEU-PROJETO.pages.dev/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sua-senha-forte","setupKey":"SUA_ADMIN_SETUP_KEY"}'
```

Depois disso, você pode (opcionalmente) trocar/remover o `ADMIN_SETUP_KEY`
com `npx wrangler pages secret put ADMIN_SETUP_KEY` novamente, já que o
endpoint de setup só é utilizável enquanto não existir nenhum admin.

### 8. Domínio próprio (opcional)

Em **Cloudflare Dashboard → Pages → seu projeto → Custom domains**, adicione
seu domínio (ex: `cardapio.suadoceria.com.br`).

---

## Scripts disponíveis

| Script                    | O que faz                                                        |
|---------------------------|-------------------------------------------------------------------|
| `npm run dev`              | Vite dev server (hot-reload do front-end)                        |
| `npm run build`             | Typecheck + build de produção do front-end (`dist/`)             |
| `npm run pages:dev`          | Build + `wrangler pages dev` (front-end + API + D1/R2 simulados) |
| `npm run pages:deploy`        | Build + deploy para o Cloudflare Pages                           |
| `npm run db:create`           | Cria o banco D1 remoto                                            |
| `npm run db:migrate:local`     | Aplica `schema.sql` no D1 local                                   |
| `npm run db:migrate:remote`    | Aplica `schema.sql` no D1 remoto (produção)                       |
| `npm run db:seed:local`        | Aplica `seed.sql` no D1 local                                     |
| `npm run db:seed:remote`       | Aplica `seed.sql` no D1 remoto                                    |
| `npm run typecheck`             | Roda apenas o TypeScript (`tsc -b --noEmit`)                      |

## Segurança — pontos já cobertos

- Senha do admin nunca é armazenada em texto puro (PBKDF2 + salt aleatório,
  100.000 iterações, comparação em tempo constante).
- Sessão via cookie `HttpOnly` + `Secure` (em produção) + `SameSite=Lax`,
  nunca exposta ao JavaScript do front-end.
- Todas as rotas `/api/admin/*` e `/api/orders/admin/*` exigem sessão válida
  (middleware `requireAdmin`).
- Preço de produtos e adicionais é **sempre recalculado no servidor** a
  partir do banco no momento da criação do pedido — o front-end nunca é
  fonte de verdade para valores monetários.
- Upload de imagens valida tipo MIME e tamanho máximo (5MB) antes de gravar
  no R2.
