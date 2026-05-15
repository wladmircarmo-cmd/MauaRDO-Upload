# Relatorio de Funcionalidades - Maua RDO

Data da analise: 15/05/2026

## 1. Visao geral

O projeto `MauaRDO-Upload` e uma aplicacao web em Next.js 15 com TypeScript para registro de RDO por Centro de Custo, Ordem de Servico e atividade WBS/EAP, com upload de fotos e historico de lancamentos.

A aplicacao usa Supabase para autenticacao, controle de sessao, banco de dados, Storage e logs de auditoria. Tambem consome uma API externa do Estaleiro Maua para carregar CCs, OSs e atividades/WBS.

## 2. Stack principal

- Next.js 15 com App Router.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- Supabase SSR e Supabase JS.
- Autenticacao OAuth via Google.
- Supabase Storage no bucket `fotos-planilhas`.
- `react-dropzone` para selecao/arraste de imagens.
- `browser-image-compression` para compressao no navegador.
- `zod` para validacao de ambiente e payloads.
- `sharp` disponivel para normalizacao/compressao server-side, embora o fluxo atual de upload nao chame essa rotina.

## 3. Rotas de tela

### `/`

Tela principal do sistema, renderizada por `src/app/page.tsx` com o componente `MainScreen`.

Funcionalidades:

- Exibe a marca "Maua RDO" com logo.
- Permite alternar entre tema claro e escuro.
- Carrega o papel do usuario autenticado.
- Exibe botao de acesso ao painel administrativo para usuarios `admin` ou `owner`.
- Permite logout manual e registra evento `LOGOUT` em `audit_logs`.
- Lista CCs vindos da API externa.
- Permite filtrar CCs por data usando os modos:
  - `Vigentes`: data dentro do periodo de inicio/fim.
  - `Inicio`: data igual a `data_inicio`.
  - `Fim`: data igual a `data_fim`.
- Carrega atividades/WBS relacionadas ao CC selecionado.
- Preenche automaticamente OS a partir da atividade selecionada.
- Permite adicionar descricao/comentario da atividade.
- Permite selecionar fotos por camera, galeria ou arrastar/soltar.
- Limita o envio a no maximo 4 fotos por atividade/WBS no mesmo CC e data.
- Mostra quantidade de fotos ja enviadas e vagas restantes.
- Permite enviar um novo RDO ou atualizar um RDO ja existente.
- Mostra status de carregamento, sucesso e erro.
- Lista lancamentos recentes com paginacao.
- Mostra detalhes do RDO em modal.
- Mostra galeria de fotos em modal.
- Indica atividades editadas por marcador visual.

### `/login`

Tela de login do sistema.

Funcionalidades:

- Login com Google via Supabase OAuth.
- Redirecionamento para `/auth/callback`.
- Mensagem de acesso negado quando a URL possui `?error=unauthorized`.
- Tema claro/escuro persistido em `localStorage`.
- Interface de acesso restrito a colaboradores autorizados.

### `/auth/callback`

Tela cliente que processa o retorno do OAuth.

Funcionalidades:

- Le o parametro `code` da URL.
- Troca o codigo por uma sessao Supabase com `exchangeCodeForSession`.
- Redireciona para `/` em caso de sucesso.
- Redireciona para `/login?error=unauthorized` quando nao ha codigo ou ocorre erro.

### `/admin`

Painel administrativo.

Funcionalidades:

- Exibe logs de auditoria em tabela paginada.
- Lista eventos como `LOGIN`, `LOGOUT`, `RDO_UPLOAD` e `RDO_EDIT`.
- Exibe usuario, IP, detalhes e data/hora dos eventos.
- Permite atualizar manualmente a lista de logs.
- Para usuario `owner`, libera aba de gestao de usuarios.
- Permite adicionar e-mails autorizados em `authorized_users`.
- Permite escolher perfil do novo usuario:
  - `planejador`
  - `assistente de planejamento`
  - `auxiliar de planejamento`
  - `consulta`
  - `admin`
- Permite remover usuarios autorizados, exceto registros com papel `owner`.
- Possui alternancia de tema claro/escuro.

## 4. Controle de acesso e permissoes

O controle de acesso e feito principalmente por `src/middleware.ts`.

Regras implementadas:

- Usuario sem sessao e redirecionado para `/login`.
- Rotas `/login` e `/auth/*` sao liberadas para fluxo de autenticacao.
- Usuario autenticado precisa estar na tabela `authorized_users` ou ser um dos owners de contingencia.
- Owners de contingencia no middleware:
  - `wladmir.carmo@estaleiromaua.ind.br`
  - `alexander.araujo@estaleiromaua.ind.br`
- Usuario fora da whitelist e redirecionado para `/login?error=unauthorized`.
- Rota `/admin` e protegida para `admin` ou `owner`.
- Usuario logado e autorizado e redirecionado de `/login` para `/`.

Papeis usados na tela principal:

- `consulta`: acesso apenas de leitura, sem upload.
- `admin` e `owner`: acesso administrativo.
- `user`, `admin`, `owner`, `assistente de planejamento`, `auxiliar de planejamento`: podem enviar/atualizar RDO.

Observacao: o papel `planejador` aparece no painel admin como opcao de cadastro, mas nao esta incluido na lista `canWrite` da tela principal.

## 5. Fluxo de upload de RDO

O upload e processado por `POST /api/upload`.

Etapas:

1. Recebe `FormData` com:
   - `file`
   - `wbs`
   - `description`
   - `cc`
   - `os`
   - `date`
   - `uploadType_N`, com valor `camera` ou `gallery`
2. Valida existencia de WBS e arquivos.
3. Valida tipo de imagem permitido:
   - JPG/JPEG
   - PNG
   - WEBP
4. Valida tamanho maximo de 10 MB por imagem.
5. Valida campos com `zod`.
6. Confirma sessao do usuario.
7. Bloqueia usuario com perfil `consulta`.
8. Busca ou cria registro em `rdo` por CC e data.
9. Busca ou cria registro em `rdo_os` por RDO e OS.
10. Busca ou cria atividade em `rdo_atividades` por OS e WBS normalizada.
11. Se a atividade ja existe, atualiza comentario e `updated_at`.
12. Salva cada imagem no Supabase Storage.
13. Cria registro em `rdo_imagens` com URL publica e tipo de envio.
14. Registra log de auditoria como `RDO_UPLOAD` ou `RDO_EDIT`.
15. Retorna sucesso com quantidade e paths salvos.

Normalizacao de WBS:

- A funcao `normalizeWbs` troca pontos por hifens.
- Exemplo: `1.02.003` vira `1-02-003`.

Nome dos arquivos:

- Fotos de camera recebem prefixo `cam`.
- Fotos de galeria recebem prefixo `gal`.
- O path no Storage segue o padrao:
  - `WBS_NORMALIZADA/prefixo-timestamp-random.ext`

## 6. Historico de lancamentos

O historico e fornecido por `GET /api/history`.

Funcionalidades:

- Busca dados em `rdo_atividades`.
- Junta informacoes de:
  - `rdo_os`
  - `rdo`
  - `rdo_imagens`
- Ordena por `created_at` decrescente.
- Usa paginacao de 10 itens por pagina.
- Agrupa atividades por OS, data e CC.
- Soma total de fotos por grupo.
- Retorna URLs das imagens para visualizacao.
- Marca atividade como editada quando `updated_at` difere de `created_at` por mais de 5 segundos.

## 7. Integracao com API externa Maua

Arquivo principal: `src/lib/external-api.ts`.

Endpoint usado:

- `https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php`

Funcionalidades:

- Busca lista de WBS/EAP.
- Busca CCs.
- Busca OSs.
- Usa token Bearer fixo no codigo.
- Remove duplicidade de CC por `cod_ccusto`.
- Filtra CCs com `status === "Em Progresso"`.
- Aplica filtros de data por inicio, fim ou vigencia.
- Para tarefas, permite filtrar por CC e OS.

Rotas relacionadas:

- `GET /api/options`: retorna CCs e OSs filtrados.
- `GET /api/options/tasks?cc=...&os=...`: retorna tarefas filtradas.
- `GET /api/wbs`: retorna lista externa de WBS.

## 8. Banco de dados e Storage

Tabelas usadas pelo codigo atual:

- `authorized_users`: whitelist de e-mails e papeis.
- `profiles`: fallback de perfil/papel do usuario.
- `audit_logs`: eventos do sistema.
- `rdo`: cabecalho por CC e data.
- `rdo_os`: OS vinculada ao RDO.
- `rdo_atividades`: atividade/WBS e comentario.
- `rdo_imagens`: imagens vinculadas a atividade.

Storage:

- Bucket: `fotos-planilhas`.
- O codigo obtem URL publica das imagens com `getPublicUrl`.

Arquivo SQL existente:

- `supabase/uploads.sql` cria uma tabela legada `uploads`, mas o fluxo atual de upload nao usa essa tabela.

## 9. Auditoria

Eventos registrados:

- `LOGOUT`: ao clicar em sair na tela principal.
- `RDO_UPLOAD`: ao criar nova atividade/RDO.
- `RDO_EDIT`: ao atualizar comentario ou adicionar fotos em atividade existente.
- Outros eventos podem ser enviados por `POST /api/log`.

Dados comuns registrados:

- `user_id`
- `user_email`
- `action_type`
- `entity_id`
- `ip_address`
- `details`

Detalhes do upload incluem:

- CC
- OS
- WBS
- quantidade de fotos
- ID do RDO
- comentario anterior, quando editado
- novo comentario

## 10. Validacoes e limites

Validacoes de upload:

- WBS obrigatoria e no formato numerico com pontos.
- CC obrigatorio.
- OS obrigatoria.
- Data obrigatoria.
- Imagem obrigatoria.
- Tipos permitidos: JPG, JPEG, PNG e WEBP.
- Tamanho maximo por arquivo: 10 MB.
- Limite visual/funcional na tela: 4 fotos por atividade no mesmo CC e data.

Validacoes de ambiente:

- `NEXT_PUBLIC_SUPABASE_URL` precisa ser uma URL valida.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` obrigatoria.
- `SUPABASE_SERVICE_ROLE_KEY` obrigatoria no servidor.

## 11. Experiencia de usuario

Recursos de interface:

- Layout responsivo e mobile-friendly.
- Entrada por camera usando `capture="environment"`.
- Entrada por galeria com multiplas imagens quando houver mais de uma vaga.
- Arrastar e soltar imagens via `react-dropzone`.
- Previews locais das imagens selecionadas.
- Remocao de imagem antes do envio.
- Feedback de compressao por foto.
- Feedback de envio.
- Modal de detalhes do RDO.
- Modal de galeria de fotos.
- Tema claro/escuro persistido.
- Indicacao de limite de fotos atingido.
- Indicacao de atividade ja lancada para a data/CC selecionados.

## 12. Arquivos principais

- `src/components/MainScreen.tsx`: tela principal e maior parte da UX de RDO.
- `src/app/login/page.tsx`: login com Google.
- `src/app/auth/callback/page.tsx`: callback OAuth.
- `src/app/admin/page.tsx`: painel administrativo.
- `src/app/api/upload/route.ts`: criacao/atualizacao de RDO e upload de fotos.
- `src/app/api/history/route.ts`: historico agrupado.
- `src/app/api/options/route.ts`: CCs e OSs da API externa.
- `src/app/api/options/tasks/route.ts`: tarefas/WBS por CC/OS.
- `src/app/api/wbs/route.ts`: lista de WBS da API externa.
- `src/app/api/log/route.ts`: insercao generica de logs.
- `src/lib/external-api.ts`: integracao com API externa Maua.
- `src/lib/upload/validation.ts`: validacoes de upload.
- `src/lib/upload/image.ts`: utilitario de compressao server-side com Sharp.
- `src/lib/supabase/*`: clients Supabase browser, server, admin e middleware.
- `src/middleware.ts`: protecao de rotas e autorizacao.
- `middleware.ts`: middleware simplificado na raiz.

## 13. Pontos de atencao encontrados

- Existem dois arquivos de middleware: `middleware.ts` na raiz e `src/middleware.ts`. Em projetos Next.js normalmente se usa um middleware em um dos locais; vale confirmar qual esta sendo aplicado no build.
- O `README.md` menciona Google Drive e `src/lib/google/drive.ts`, mas esse arquivo nao existe no projeto analisado.
- O `README.md` tambem cita a tabela `uploads`, mas o fluxo atual usa tabelas `rdo`, `rdo_os`, `rdo_atividades` e `rdo_imagens`.
- O utilitario `compressAndNormalizeImage` com Sharp existe, mas nao e chamado em `POST /api/upload`; a compressao ativa esta no navegador.
- A funcao `assertWbsExists` existe, mas nao e usada no upload atual.
- O token da API externa esta fixo em `src/lib/external-api.ts`; por seguranca, o ideal seria mover para variavel de ambiente server-side.
- A opcao de perfil `planejador` pode ser cadastrada, mas nao tem permissao de escrita no `canWrite`.
- A verificacao de permissao no upload consulta `profiles`, enquanto a tela principal prioriza `authorized_users`; isso pode gerar diferencas se os papeis divergirem entre tabelas.
- Algumas strings no README e em textos antigos aparecem com problemas de codificacao, como `AplicaÃ§Ã£o`.

## 14. Resumo funcional

O sistema atualmente entrega um fluxo completo para:

- Autenticar usuario via Google.
- Bloquear acesso por whitelist.
- Controlar permissoes por papel.
- Selecionar CC, data, OS e WBS vindos de API externa.
- Registrar descricao de atividade.
- Enviar fotos comprimidas pelo navegador.
- Persistir RDO em estrutura relacional no Supabase.
- Armazenar imagens no Supabase Storage.
- Visualizar historico e fotos enviadas.
- Auditar acoes importantes.
- Administrar usuarios autorizados e consultar logs.

