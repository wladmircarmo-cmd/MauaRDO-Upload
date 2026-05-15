---
name: maua-scp-consultas
description: Consultas operacionais das APIs Maua SCP para portaria, funcionarios, timesheet, job card, pendencias, centro de custo, EAP e progresso por OS. Use quando o usuario pedir faltas, acessos de portaria, equipes, distribuicao de pessoas por centro de custo, OS ou atividade, ou cruzamentos entre JCI e Timesheet.
---

# Maua SCP Consultas

Use esta skill quando a solicitacao envolver:

- acessos de portaria
- equipe e cadastro de funcionarios
- distribuicao de pessoas ou HH por centro de custo, OS ou atividade
- comparacao entre fonte JCI e fonte Timesheet
- faltas e pendencias
- Job Cards, digitadores e baixas

## Leitura minima

Leia primeiro:

- `references/request_mapping.md`

Leia tambem quando necessario:

- `references/pendencias_logic.md` para analises de pendencias
- `../../../SCP/Chaves_API.md` para token atual, bases, schema e validacao detalhada

## Workflow

1. Identifique a natureza do pedido:
   - presenca/acesso
   - equipe
   - apropriacao
   - Job Card
   - pendencia
   - progresso

2. Identifique a fonte correta:
   - `Maua_Timesheet.php` para apropriacao
   - `ApiMaua.php?op=consulta_madis` para acesso
   - `Maua_Funcionarios.php` para universo da equipe
   - `Maua_JC.php` para Job Card
   - `Maua_Pendencias.php` para visao consolidada de pendencias
   - quando o pedido mencionar `Manutenção` em consultas de equipe via `Maua_Funcionarios.php`, interprete como o conjunto fixo de `ccusto` definido nas regras de interpretacao

3. Para pedidos que cruzam bancos, exponha sempre as duas leituras:
   - lado JCI/operacional
   - lado Timesheet
   - em comparacoes `JC x Timesheet`, trate `Maua_JC.php` como fonte operacional de origem e `Maua_Timesheet.php` como base receptora
   - diferencas entre `JC` e `Timesheet` podem significar atraso de integracao, e nao necessariamente erro de lancamento

4. Para faltas, use a regra base do dominio:
   - `faltas = Funcionarios - Portaria`
   - se a leitura pedir visao operacional, mostre tambem a variante filtrada por `codsituacao = A`
   - trate `codsituacao = D` como desconvocado quando `codrecebimento = H`
   - trate `codrecebimento = H` como mao de obra intermitente/horista
   - trate `codrecebimento = M` como mao de obra mensalista
   - use `tpmaoobra` para separar mao de obra direta, indireta e administrativa quando a leitura pedir corte por tipo de mao de obra

5. Para pendencias:
   - use `Maua_Pendencias.php` como lista principal
   - detalhe a causa com `STATUS_PORTARIA`, `STATUS_JC` e `PENDENCIA`
   - agrupe principalmente por `STATUS_JC`
   - em seguida, agrupe por `disciplina`
   - derive `disciplina` primeiro pela correlacao de `CHAPA` com `Maua_Funcionarios.php`
   - use `DESCR_CCUSTO` da propria pendencia apenas como fallback quando a matricula nao for localizada em `Maua_Funcionarios.php`
   - se necessario, desdobre em `Portaria`, `JC` e `Timesheet`

6. Para distribuicao por CC, OS e atividade:
   - use `Maua_Timesheet.php` como base principal
   - use `Maua_Funcionarios.php` para enriquecer equipe
   - use `Maua_Eap.php` e `Maua_ProgressoOS.php` para planejamento e progresso

7. Para perguntas temporais, consulte ao vivo as APIs. Nao responda apenas com base no markdown.
8. Quando houver agregacao por centro de custo, nao trunque a lista silenciosamente:
   - se mostrar apenas parte do resultado, rotule explicitamente como `top N`
   - se o usuario perguntar por distribuicao de CC, preferir entregar a tabela completa ou anexar arquivo com todos os CCs
   - se um CC nao aparecer no resumo curto, nao insinuar ausencia; esclareca que ele pode estar fora do topo mostrado

## Regras de interpretacao

Na leitura de `Maua_Funcionarios.php`, usar estas regras de negocio:

- `codsituacao = A`: Ativo
- `codsituacao = D`: Desconvocado, aplicavel apenas quando `codrecebimento = H`
- `codrecebimento = H`: mao de obra intermitente ou horista
- `codrecebimento = M`: mao de obra mensalista
- `tpmaoobra = MOD`: mao de obra direta
- `tpmaoobra = MOI`: mao de obra indireta
- `tpmaoobra = ADM`: administrativo
- `Manutenção`, quando usada como filtro em `Maua_Funcionarios.php`, significa os `ccusto`: `295700`, `295701`, `395700`, `395701`, `395702`, `395703`, `395704`, `395705`
- `Ferramentaria` entra no mesmo filtro de `Manutenção`
- `Maua_JC.php` e a fonte operacional de origem dos lancamentos de Job Card
- `Maua_Timesheet.php` recebe os dados integrados do Job Card
- se um lancamento estiver no `JC` e nao estiver no `Timesheet`, interpretar primeiro como possivel integracao ainda nao processada

Para pendencias, usar estas disciplinas operacionais quando forem referenciadas:

- `Estrutura - Reparo`
- `Docagem`
- `Pintura`
- `Mecânica`
- `Tubulação`
- `Estrutura - FEM`
- `Estrutura - Construção`
- `Apoio Operacional`
- `Manutenção`

Mapeamento recomendado da disciplina a partir de `descr_ccusto` / `ccusto`:

- `Estrutura / Acabamento - Reparo` -> `Estrutura - Reparo`
- `Estrutura / Acabamento - FEM` -> `Estrutura - FEM`
- `Estrutura / Acabamento - Construcao` -> `Estrutura - Construção`
- `Tratamento e Pintura - Reparo` ou `Tratamento e Pintura - Construcao` -> `Pintura`
- `Tubulações - Reparo` ou `Tubulações - Construcao` -> `Tubulação`
- `Máquinas - Reparo` ou `Maquinas - Construcao` -> `Mecânica`
- `Docagem` -> `Docagem`
- `Apoio Operacional` -> `Apoio Operacional`
- `ccusto` de `Manutenção` definidos nesta skill -> `Manutenção`

Importante:

- nao assumir significado para outros codigos de `codsituacao` sem confirmacao do usuario ou evidencia operacional adicional
- nao assumir significado para outros codigos de `tpmaoobra` sem confirmacao adicional
- ao analisar faltas, separar sempre a leitura de ativos da leitura de desconvocados horistas quando isso afetar o total
- quando o usuario disser apenas `Manutenção`, preferir esse conjunto de `ccusto` em vez de filtro textual por `descr_ccusto` na `Maua_Funcionarios.php`
- quando o usuario pedir `sem Manutenção`, excluir tambem `Ferramentaria`
- em resumos por `ccusto`, indicar sempre se a lista e completa ou apenas um recorte ordenado
- em `Pendencias`, a ordem padrao de leitura e `STATUS_JC -> disciplina`
- em comparacoes `JC x Timesheet`, distinguir sempre:
  - registrado no `JC`
  - ja integrado no `Timesheet`
  - ainda nao integrado no `Timesheet`

## Gestao de Turnos (Heuristica)

Devido a sparse do campo `turno`, as consultas devem aplicar a heuristica detalhada em `references/shift_logic.md`:
- **Noturno:** Ciclo inicia ~18h. Confirmacao por 2/3 marcas (Entrada 18h+, Janta 00h, Saida ~05:30h).
- **Diurno:** Ciclo inicia ~05:30h. Marcas predominantes entre 05:30 e 20:00.
- **Historico:** Consultar dia anterior para confirmar turno se necessario.

## Consideracoes tecnicas para desenvolvedores

Ao construir scripts ou consultas diretas:

- **BOM (Byte Order Mark):** As APIs Maua podem retornar JSON com BOM. Ao usar Python/Requests, force `response.encoding = 'utf-8-sig'` antes de chamar `response.json()`.
- **Formato de Data em Acesso:** Na `ApiMaua.php?op=consulta_madis`, prefira `DT_REQUISICAO` como timestamp completo. Use `DATA` quando precisar apenas da data e `HORA` quando precisar apenas do horario.
- **Custo de Manutenção:** Sempre use `str(f.get('ccusto'))` para comparar com a lista de exclusão, pois o tipo pode variar entre string e inteiro.

## Ferramentas e scripts

Validador da skill:

- `scripts/validate_maua_apis.py`
- `scripts/analisar_faltas_nominais.py`

Scripts ja existentes no projeto:

- `../../../SCP/comparar_portaria_timesheet_jc.py`
- `../../../SCP/consulta_maua_jc.py`

## Prompts modelo

Use estes exemplos como ponto de partida. Ajuste datas, filtros e nivel de detalhamento conforme o pedido.

1. `$maua-scp-consultas analisar faltas do dia 2026-04-08 comparando Maua_Funcionarios com ApiMaua consulta_madis e mostrar totais por centro de custo`
2. `$maua-scp-consultas listar quem acessou a empresa no dia 2026-04-08 e nao teve apropriacao no Maua_Timesheet`
3. `$maua-scp-consultas cruzar JCI x Timesheet no periodo de 2026-04-01 a 2026-04-08 e destacar divergencias por pessoa`
4. `$maua-scp-consultas distribuir pessoas e HH por centro de custo no periodo de 2026-04-01 a 2026-04-08`
5. `$maua-scp-consultas distribuir pessoas e HH por OS no periodo de 2026-04-01 a 2026-04-08 e comparar com Maua_ProgressoOS`
6. `$maua-scp-consultas distribuir pessoas e HH por atividade no periodo de 2026-04-01 a 2026-04-08 e destacar as atividades com maior volume`
7. `$maua-scp-consultas listar pendencias de 2026-04-01 a 2026-04-08 agrupadas por encarregado, equipe e digitador`
8. `$maua-scp-consultas mostrar as classificacoes de pendencias no periodo de 2026-04-01 a 2026-04-08 com STATUS_PORTARIA, STATUS_JC e saldo PENDENCIA`
9. `$maua-scp-consultas consultar a equipe atual do Maua_Funcionarios e distribuir por centro de custo, funcao, codrecebimento e supervisor`
10. `$maua-scp-consultas listar os Job Cards do periodo de 2026-04-01 a 2026-04-08 com usuario_digitacao, data_digitacao e agrupamento por digitador`
11. `$maua-scp-consultas listar soldadores ativos ausentes nos últimos 5 dias, excluindo manutenção`

## Padrao de resposta

Quando a solicitacao pedir analise operacional:

- informe quais APIs foram usadas
- informe o periodo
- informe a regra de cruzamento
- entregue totais e recortes
- quando houver agregacao por `ccusto`, sinalize se a lista e completa ou `top N`
- destaque diferencas entre JCI e Timesheet
- cite riscos de leitura quando houver `avisos` em `Pendencias`
