# Fotos • WBS Upload (Next.js 15 + Supabase)

Aplicação com **uma tela** para:

- Selecionar/tirar foto (mobile-friendly)
- Selecionar WBS
- Enviar imagem
  - salva no **Supabase Storage** (bucket `fotos-planilhas`)
  - salva metadados na tabela `uploads`

## Stack

- Next.js 15 (App Router) + TypeScript
- TailwindCSS
- Supabase Storage
- `react-dropzone`, `browser-image-compression`, `zod`, `sharp`

## Estrutura

- `src/app/`: rotas (UI + API)
- `src/components/`: UI (tela única)
- `src/data/wbs.json`: lista de WBS
- `src/lib/`:
  - `supabase/`: clients + middleware SSR
  - `upload/`: validações + normalização/compressão
- `src/types/`: tipos
- `supabase/uploads.sql`: SQL da tabela

## Pré-requisitos

- Node 20+ (recomendado) / você está usando Node 22 ok
- Projeto Supabase criado

## Configuração no Supabase

1. Crie um projeto no Supabase.
2. Crie um bucket chamado **`fotos-planilhas`** no Supabase Storage.
3. Configure as políticas de acesso do bucket para permitir upload anônimo ou autorize pelo serviço.

## Storage (bucket)

Crie um bucket chamado **`fotos-planilhas`** no Supabase Storage.

O path usado é:

`wbs-normalizado/uuid.jpg`

Exemplo:

`1-01-001/550e8400-e29b-41d4-a716-446655440000.jpg`

## Banco (SQL)

Execute o SQL em `supabase/uploads.sql`.

## Variáveis de ambiente

Edite `.env.local` com suas chaves:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Deploy na Vercel

1. Suba o repositório no GitHub
2. Import no Vercel
3. Configure as env vars (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Garanta que o redirect no Google Cloud inclua:
   - `https://SEU-PROJETO.vercel.app/auth/callback`

## Arquitetura (resumo)

- **Login**: `supabase.auth.signInWithOAuth` com scope `drive.file` e callback em `src/app/auth/callback/route.ts`
- **Sessão SSR**: `middleware.ts` mantém cookies atualizados para rotas server-side
- **Upload**:
  - UI comprime no browser (`browser-image-compression`)
  - API (`src/app/api/upload/route.ts`) valida + normaliza + recomprime (Sharp) → Storage + Drive + DB
- **Drive**: `src/lib/google/drive.ts` usa **`provider_token`** (não service account)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
