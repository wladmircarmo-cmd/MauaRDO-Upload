# Relatorio de Funcionalidades - Maua RDO

Data da analise: 15/05/2026

## 1. Visao Geral

O projeto `MauaRDO-Upload` e uma aplicacao web em Next.js para registro, consulta e auditoria de RDOs por Centro de Custo, Ordem de Servico e atividade WBS/EAP.

A aplicacao usa Supabase para autenticacao, banco de dados, Storage, logs de auditoria e controle de acesso. As informacoes externas de CC, OS e WBS/EAP deixaram de depender de consulta direta em tempo real na API do Estaleiro Maua e agora passam por uma camada de cache no Supabase, atualizada por uma rota de sincronizacao agendada.

## 2. Stack Principal

- Next.js 15 com App Router.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- Supabase SSR e Supabase JS.
- Autenticacao OAuth via Google.
- Supabase Storage no bucket `fotos-planilhas`.
- `react-dropzone` para selecao/arraste de imagens.
- `browser-image-compression` para compressao no navegador.
- `zod` para validacao de variaveis de ambiente e payloads.
- Vercel Cron para sincronizacao diaria de dados externos.

## 3. Telas da Aplicacao

### `/`

Tela principal para lancamento de RDO.

Funcionalidades:

- Exibe logo e titulo "Maua RDO".
- Usa header laranja padrao `#F18213`.
- Possui menu sanduiche com:
  - Dashboard, quando usuario e `admin` ou `owner`.
  - Consulta.
  - Alternancia de tema.
  - Logout.
- Tema claro e padrao inicial da aplicacao.
- Tema escuro so e ativado quando o usuario muda manualmente pelo botao.
- Carrega papel do usuario autenticado.
- Lista somente CCs marcados como visiveis no Dashboard Admin.
- A tela principal nao exibe mais filtro de data nem botoes `Vigentes`, `Inicio` e `Fim`.
- A data do RDO continua sendo usada internamente como a data atual do lancamento.
- Carrega atividades/WBS a partir do CC selecionado.
- Preenche automaticamente a OS com base na atividade selecionada.
- Permite adicionar descricao/comentario da atividade.
- Permite selecionar fotos por camera, galeria ou arrastar/soltar.
- Limita o envio a no maximo 4 fotos por atividade/WBS no mesmo CC e data.
- Mostra quantidade de fotos ja enviadas e vagas restantes.
- Permite criar novo RDO ou atualizar atividade ja existente.
- Exibe status de carregamento, sucesso e erro.
- Mostra lancamentos recentes.
- Abre modal de detalhes do RDO.
- Abre galeria de fotos em modal.
- Permite excluir atividades no modal quando usuario e `admin` ou `owner`.
- Atualiza historico apos exclusao.

### `/consulta`

Tela criada para usuarios de consulta e tambem acessivel via menu.

Funcionalidades:

- Header azul padrao `#364B59`.
- Menu sanduiche com:
  - RDO, para usuarios que nao sao somente `consulta`.
  - Dashboard, para `admin` ou `owner`.
  - Alternancia de tema.
  - Logout.
- Carrega somente CCs marcados como visiveis no Dashboard Admin.
- Permite selecionar CC.
- Exibe campos para buscar por data e buscar por OS.
- Lista todas as OS do CC, inclusive OS sem atividade/RDO lancado.
- Lista de OS com paginacao de 10 em 10.
- Cards exibem:
  - CC.
  - Status com ou sem lancamento.
  - Numero da OS.
  - Descricao da OS.
  - Quantidade de RDOs.
  - Quantidade de atividades disponiveis.
- Cards podem ser expandidos para listar RDOs vinculados.
- RDO vinculado exibe data, nome/WBS e descricao.
- Ao clicar no RDO, abre modal com detalhes.
- Modal mostra:
  - Data do RDO.
  - Centro de custo.
  - Quantidade de atividades.
  - Quantidade de fotos.
  - Lista de atividades relacionadas.
  - Botao para ver fotos da atividade.
  - Botao de excluir atividade para `admin` e `owner`.
- Galeria de fotos em tela cheia.
- Tema claro/escuro aplicado em cards, menu e modal.
- Cards no tema claro foram ajustados para maior contraste em relacao ao fundo.

### `/login`

Tela de login.

Funcionalidades:

- Login com Google via Supabase OAuth.
- Redirecionamento para `/auth/callback`.
- Exibe erro de acesso negado quando a URL contem `?error=unauthorized`.
- Mantem tema claro/escuro via `localStorage`.
- Interface de acesso restrito.

### `/auth/callback`

Tela de retorno do OAuth.

Funcionalidades:

- Le o parametro `code` da URL.
- Troca codigo por sessao Supabase.
- Redireciona para `/` apos sucesso.
- Redireciona para `/login?error=unauthorized` em falha.

### `/admin`

Painel administrativo.

Funcionalidades:

- Header redesenhado para seguir o padrao visual da aplicacao.
- Alternancia de tema claro/escuro.
- Abas:
  - Logs.
  - Centros de Custo.
  - Gestao de Usuarios, apenas para `owner`.

#### Aba Logs

- Lista logs de auditoria.
- Exibe eventos como:
  - `LOGIN`.
  - `LOGOUT`.
  - `RDO_UPLOAD`.
  - `RDO_EDIT`.
  - `RDO_DELETE`.
- Mostra usuario, IP, detalhes e data/hora.
- Possui paginacao.
- Permite atualizar manualmente.

#### Aba Centros de Custo

- Lista todos os CCs sincronizados da tabela `external_ccs`.
- Permite buscar por codigo, descricao ou status.
- Exibe:
  - Codigo do CC.
  - Descricao.
  - Status vindo da API externa.
  - Periodo de inicio/fim, quando existir.
  - Marcador de visibilidade.
- Possui toggle para escolher quais CCs aparecem no upload e na consulta.
- Usa coluna `show_in_app`.
- Possui paginacao de 10 em 10.
- Exibe contador de CCs ativos/visiveis.

#### Aba Gestao de Usuarios

- Disponivel apenas para `owner`.
- Permite cadastrar e-mails autorizados em `authorized_users`.
- Perfis disponiveis:
  - `planejador`.
  - `assistente de planejamento`.
  - `auxiliar de planejamento`.
  - `consulta`.
  - `admin`.
- Permite remover usuarios autorizados, exceto `owner`.

## 4. Controle de Acesso

Arquivo principal: `src/middleware.ts`.

Regras:

- Usuario sem sessao e redirecionado para `/login`.
- `/login` e `/auth/*` sao liberadas para o fluxo de autenticacao.
- `/api/sync/*` e liberada no middleware e protegida dentro da propria rota por `CRON_SECRET`.
- Usuario autenticado precisa existir em `authorized_users` ou ser owner de contingencia.
- Owners de contingencia:
  - `wladmir.carmo@estaleiromaua.ind.br`.
  - `alexander.araujo@estaleiromaua.ind.br`.
- Usuario fora da whitelist e redirecionado para `/login?error=unauthorized`.
- Rota `/admin` e permitida apenas para `admin` e `owner`.
- Usuario `consulta` e redirecionado para `/consulta` quando tenta acessar paginas fora da area permitida.
- Usuario `consulta` pode chamar rotas `/api/*` necessarias para carregar dados na tela de consulta.
- Usuario autorizado que tenta acessar `/login` e redirecionado para:
  - `/consulta`, quando role e `consulta`.
  - `/`, nos demais casos.

Papeis usados:

- `consulta`: acesso a tela de consulta.
- `admin`: acesso administrativo e exclusao de atividades.
- `owner`: acesso administrativo completo, gestao de usuarios e exclusao.
- `user`, `admin`, `owner`, `assistente de planejamento`, `auxiliar de planejamento`: podem enviar RDO.

## 5. Fluxo de Lancamento de RDO

Rota: `POST /api/upload`.

Etapas:

1. Recebe `FormData` com:
   - `file`.
   - `wbs`.
   - `description`.
   - `cc`.
   - `os`.
   - `date`.
   - `uploadType_N`, com valor `camera` ou `gallery`.
2. Valida campos obrigatorios.
3. Valida tipo de imagem:
   - JPG/JPEG.
   - PNG.
   - WEBP.
4. Valida tamanho maximo de 10 MB por imagem.
5. Valida payload com `zod`.
6. Confirma sessao do usuario.
7. Busca role em `authorized_users`, com fallback em `profiles` e owners.
8. Bloqueia usuario sem permissao de escrita.
9. Busca ou cria registro em `rdo` por CC e data.
10. Busca ou cria registro em `rdo_os` por RDO e OS.
11. Busca ou cria atividade em `rdo_atividades` por OS e WBS normalizada.
12. Atualiza comentario quando a atividade ja existe.
13. Salva imagens no Supabase Storage.
14. Cria registros em `rdo_imagens`.
15. Registra `RDO_UPLOAD` ou `RDO_EDIT` em `audit_logs`.
16. Retorna sucesso com quantidade e paths salvos.

Normalizacao de WBS:

- `normalizeWbs` troca pontos por hifens.
- Exemplo: `1.4.1` vira `1-4-1`.

Storage:

- Bucket: `fotos-planilhas`.
- Fotos de camera usam prefixo `cam`.
- Fotos de galeria usam prefixo `gal`.

## 6. Consulta e Historico de RDO

Rota: `GET /api/history`.

Funcionalidades:

- Busca dados em `rdo_atividades`.
- Junta dados de:
  - `rdo_os`.
  - `rdo`.
  - `rdo_imagens`.
- Retorna `id_atividade` para permitir exclusao.
- Aceita filtros:
  - `cc`.
  - `date`.
  - `os`.
  - `page`.
  - `limit`.
- Agrupa por OS, data e CC.
- Soma total de fotos por grupo.
- Retorna URLs das imagens.
- Marca atividade como editada quando `updated_at` difere de `created_at` por mais de 5 segundos.

## 7. Exclusao de Atividades

Rota: `DELETE /api/rdo/activity/[id]`.

Permissoes:

- Apenas `admin` e `owner`.

Fluxo:

1. Valida sessao com Supabase Server Client.
2. Busca role em `authorized_users`.
3. Aplica fallback coerente para owners.
4. Bloqueia usuarios que nao sejam `admin` ou `owner`.
5. Busca atividade, imagens e contexto antes de excluir.
6. Remove imagens do Supabase Storage.
7. Remove registros em `rdo_imagens`.
8. Remove registro em `rdo_atividades`.
9. Remove `rdo_os` se ficar sem atividades.
10. Remove `rdo` se ficar sem OS.
11. Registra `RDO_DELETE` em `audit_logs`.

Disponibilidade na interface:

- Modal da tela principal.
- Modal da tela de consulta.
- Botao aparece apenas para `admin` e `owner`.

## 8. Cache da API Externa no Supabase

O sistema possui uma camada de cache para dados externos.

Tabelas:

- `external_ccs`: centros de custo.
- `external_eap_tasks`: atividades/WBS/EAP/OS.
- `external_sync_runs`: historico de sincronizacoes.

Campos importantes:

- `external_ccs.cod_ccusto`.
- `external_ccs.descr_ccusto`.
- `external_ccs.status`.
- `external_ccs.data_inicio`.
- `external_ccs.data_fim`.
- `external_ccs.show_in_app`.
- `external_eap_tasks.id_eap`.
- `external_eap_tasks.wbs`.
- `external_eap_tasks.cod_ccusto`.
- `external_eap_tasks.os`.
- `external_eap_tasks.cod_os`.
- `external_eap_tasks.descr_os`.

Comportamento:

- A API externa ainda e a fonte original.
- O app le primeiro do Supabase.
- A tela principal e a consulta exibem apenas CCs com `show_in_app = true`.
- Nao ha mais filtro por `status === "Em Progresso"` para decidir CCs exibidos.
- O status e mantido apenas como informacao visual no admin.
- Novos CCs sincronizados entram por padrao com `show_in_app = false`.
- O admin decide manualmente quais CCs ficam disponiveis no upload e consulta.

## 9. Sincronizacao Diaria

Rota: `/api/sync/external-data`.

Arquivo: `src/app/api/sync/external-data/route.ts`.

Funcionalidades:

- Protegida por header:
  - `Authorization: Bearer CRON_SECRET`.
- Busca snapshot da API externa.
- Faz `upsert` em `external_ccs`.
- Faz `upsert` em `external_eap_tasks`.
- Registra inicio, sucesso ou erro em `external_sync_runs`.
- Retorna contagem de CCs e tarefas atualizadas.

Agendamento:

- Arquivo `vercel.json`.
- Agenda:
  - `0 9 * * *`.
- Horario pratico:
  - 09:00 UTC.
  - 06:00 em Brasilia.

Variaveis de ambiente:

- `EXTERNAL_API_TOKEN`.
- `CRON_SECRET`.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `NEXT_PUBLIC_SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 10. Rotas de Dados Externos

### `GET /api/options`

Retorna:

- CCs visiveis no app.
- OSs conhecidas.

Comportamento:

- Le `external_ccs` e `external_eap_tasks`.
- Usa `show_in_app` para filtrar CCs.
- Se a cache estiver vazia, possui fallback para API externa.

### `GET /api/options/tasks?cc=...&os=...`

Retorna tarefas/WBS.

Comportamento atual:

- Consulta diretamente `external_eap_tasks` no Supabase.
- Filtra por CC.
- Normaliza comparacao de CC para evitar problema com zeros a esquerda.
- Filtra por OS quando parametro e enviado.
- Retorna `os`, `OS` e `cod_os` para compatibilidade com as telas.

### `GET /api/wbs`

Retorna lista de WBS.

Comportamento:

- Usa `getExternalWbsList`.
- Le cache do Supabase primeiro.
- Usa fallback na API externa se necessario.

## 11. Banco de Dados e Storage

Tabelas principais:

- `authorized_users`: whitelist e role dos usuarios.
- `profiles`: fallback de perfil.
- `audit_logs`: auditoria.
- `rdo`: cabecalho por CC e data.
- `rdo_os`: OS vinculada ao RDO.
- `rdo_atividades`: atividade/WBS e comentario.
- `rdo_imagens`: imagens vinculadas a atividade.
- `external_ccs`: cache de CCs externos.
- `external_eap_tasks`: cache de tarefas/OS/WBS externas.
- `external_sync_runs`: logs de sincronizacao externa.

SQLs relevantes:

- `supabase/uploads.sql`: SQL legado de uploads.
- `supabase/cc_visibility.sql`: adiciona `show_in_app` em `external_ccs`.

Storage:

- Bucket: `fotos-planilhas`.
- URLs publicas sao obtidas com `getPublicUrl`.

## 12. Auditoria

Eventos registrados:

- `LOGOUT`.
- `RDO_UPLOAD`.
- `RDO_EDIT`.
- `RDO_DELETE`.
- Eventos genericos via `POST /api/log`.

Dados comuns:

- `user_id`.
- `user_email`.
- `action_type`.
- `entity_id`.
- `ip_address`.
- `details`.

Detalhes comuns em RDO:

- CC.
- OS.
- WBS.
- Quantidade de fotos.
- ID do RDO.
- Comentario anterior e novo comentario, quando editado.
- Contexto da atividade excluida, no caso de delete.

## 13. Validacoes e Limites

Upload:

- WBS obrigatoria.
- CC obrigatorio.
- OS obrigatoria.
- Data obrigatoria internamente.
- Imagem obrigatoria.
- Tipos permitidos: JPG, JPEG, PNG e WEBP.
- Tamanho maximo por imagem: 10 MB.
- Limite de 4 fotos por atividade/WBS no mesmo CC e data.

Ambiente:

- `NEXT_PUBLIC_SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `EXTERNAL_API_TOKEN`.
- `CRON_SECRET`.

## 14. Experiencia de Usuario

Recursos:

- Layout responsivo.
- Tema claro como padrao.
- Tema escuro manual e persistente.
- Menu sanduiche na tela principal e consulta.
- Header laranja no RDO.
- Header azul na consulta.
- Dashboard com abas redesenhadas.
- Cards da consulta com melhor contraste no tema claro.
- Modal de RDO com suporte a tema claro/escuro.
- Galeria de fotos em tela cheia.
- Indicacao de atividade editada.
- Indicacao de limite de fotos.
- Indicacao de acesso somente consulta.
- Paginacao de OS na consulta.
- Paginacao de CCs no admin.

## 15. Arquivos Principais

- `src/components/MainScreen.tsx`: tela principal de lancamento.
- `src/app/consulta/page.tsx`: tela de consulta.
- `src/app/login/page.tsx`: login.
- `src/app/auth/callback/page.tsx`: callback OAuth.
- `src/app/admin/page.tsx`: painel administrativo.
- `src/app/api/upload/route.ts`: criacao/atualizacao de RDO.
- `src/app/api/history/route.ts`: historico de RDO.
- `src/app/api/rdo/activity/[id]/route.ts`: exclusao de atividade.
- `src/app/api/options/route.ts`: CCs e OSs disponiveis.
- `src/app/api/options/tasks/route.ts`: tarefas por CC/OS.
- `src/app/api/wbs/route.ts`: lista de WBS.
- `src/app/api/sync/external-data/route.ts`: sincronizacao externa.
- `src/app/api/log/route.ts`: logs genericos.
- `src/lib/external-api.ts`: leitura da cache e fallback da API externa.
- `src/lib/env.server.ts`: variaveis server-side.
- `src/lib/upload/validation.ts`: validacoes de upload.
- `src/lib/upload/image.ts`: utilitario Sharp.
- `src/lib/supabase/*`: clients Supabase.
- `src/middleware.ts`: protecao e roteamento por role.
- `vercel.json`: agendamento do Cron.
- `supabase/cc_visibility.sql`: coluna de visibilidade dos CCs.

## 16. Pontos de Atencao

- Existem dois arquivos de middleware: `src/middleware.ts` e `middleware.ts` na raiz. O projeto deve manter claro qual deles e efetivamente usado pelo Next.
- O papel `planejador` aparece como opcao no admin, mas nao esta listado entre os papeis com permissao de upload.
- O SQL inicial das tabelas externas foi aplicado no Supabase, mas deve ser mantido versionado em migrations caso o projeto adote fluxo formal de migracoes.
- A sincronizacao depende de variaveis cadastradas tambem na Vercel.
- A cache externa depende do Cron rodar com sucesso; se falhar, o app continua usando os ultimos dados salvos.
- `supabase/uploads.sql` parece legado e nao e usado no fluxo atual de RDO.
- O utilitario Sharp existe, mas a compressao ativa do fluxo atual acontece no navegador.
- O build local do Next pode precisar limpar `.next` se houver erro de chunk antigo apos varios builds/dev servers simultaneos.

## 17. Resumo Funcional

O sistema atualmente entrega:

- Login com Google.
- Whitelist por e-mail.
- Redirecionamento por role.
- Tela principal de lancamento de RDO.
- Tela dedicada de consulta.
- Consulta de OS mesmo sem lancamento.
- Modal de detalhes e fotos.
- Exclusao controlada de atividade por `admin` e `owner`.
- Dashboard com logs, usuarios e controle manual de CCs.
- Cache Supabase para dados externos.
- Sincronizacao diaria automatica via Vercel Cron.
- Auditoria de uploads, edicoes, exclusoes e logout.
- Tema claro/escuro com padrao claro.
- Interface alinhada as cores padrao azul `#364B59` e laranja `#F18213`.
