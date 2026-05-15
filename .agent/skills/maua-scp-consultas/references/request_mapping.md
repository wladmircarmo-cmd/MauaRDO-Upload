# Request Mapping

## Fonte por tipo de pergunta

| Pergunta | API principal | Complementos | Observacao |
|---|---|---|---|
| Quem acessou? | `ApiMaua.php?op=consulta_madis` | `Maua_Funcionarios.php` | acesso real a empresa |
| Quem compoe a equipe? | `Maua_Funcionarios.php` | `Maua_CC.php` | universo base |
| Quem e da Manutenção? | `Maua_Funcionarios.php` | `Maua_CC.php` | usar o conjunto fixo de `ccusto` definido abaixo, incluindo Ferramentaria |
| Como a equipe esta distribuida por CC? | `Maua_Timesheet.php` | `Maua_Funcionarios.php`, `Maua_CC.php` | use HH e pessoas |
| Como a equipe esta distribuida por OS? | `Maua_Timesheet.php` | `Maua_Eap.php`, `Maua_ProgressoOS.php` | planejado x realizado |
| Como a equipe esta distribuida por atividade? | `Maua_Timesheet.php` | `Maua_Eap.php`, `Maua_JC.php` | atividade lancada |
| Quem faltou? | `Maua_Funcionarios.php` - `ApiMaua.php?op=consulta_madis` | `Maua_Pendencias.php` | mostrar regra e filtros |
| Quem acessou sem apropriacao? | `ApiMaua.php?op=consulta_madis` x `Maua_Timesheet.php` | `Maua_JC.php` | cruzamento diario |
| Quais sao as pendencias? | `Maua_Pendencias.php` | `Maua_Funcionarios.php`, `ApiMaua.php?op=consulta_madis`, `Maua_JC.php`, `Maua_Timesheet.php` | agrupar primeiro por `STATUS_JC`, depois por disciplina |
| Quem digitou os lancamentos? | `Maua_Timesheet.php`, `Maua_JC.php`, `Maua_Pendencias.php` | - | `USUARIO` ou `usuario_digitacao` |
| Qual o progresso da OS? | `Maua_ProgressoOS.php` | `Maua_Eap.php`, `Maua_Timesheet.php` | hh previsto x real |

## Regras de cruzamento

### Faltas

Regra base:

- `distinct(Funcionarios.chapa) - distinct(Portaria.CHAPA)`

Regras de interpretacao antes do calculo:

- `codsituacao = A` significa Ativo
- `codsituacao = D` significa Desconvocado, aplicavel apenas para `codrecebimento = H`
- `codrecebimento = H` significa mao de obra intermitente ou horista
- `codrecebimento = M` significa mao de obra mensalista
- `tpmaoobra = MOD` significa mao de obra direta
- `tpmaoobra = MOI` significa mao de obra indireta
- `tpmaoobra = ADM` significa administrativo
- `Manutenção`, em `Maua_Funcionarios.php`, significa os `ccusto`: `295700`, `295701`, `395700`, `395701`, `395702`, `395703`, `395704`, `395705`

Forma de apresentar:

- total de funcionarios considerados
- total com acesso
- total faltante
- se houver filtro de status, declarar claramente
- quando houver `H` desconvocado, separar ou excluir esse grupo conforme o objetivo da leitura
- quando a leitura pedir corte por tipo de mao de obra, separar `MOD`, `MOI` e `ADM`
- quando a leitura pedir `Manutenção`, aplicar o filtro por `ccusto` definido acima antes de agregar

### Presenca com apropriacao

Regra base:

- `distinct(Portaria.CHAPA)` cruzado com `distinct(Timesheet.CHAPA)`

Opcional:

- acrescentar `Maua_JC.php` para informar numeros de Job Card por chapa

### Distribuicao por CC, OS e atividade

Agrupar principalmente por:

- `CODCCUSTO` / `CENTROCUSTO`
- `CODOS` / `OS`
- `CODATIVIDADE` / `ATIVIDADE`

Medidas:

- pessoas distintas
- `HN`
- `H50`
- `H100`
- HH total

Forma de apresentar:

- quando a pergunta for por centro de custo, preferir a lista completa de CC
- se a resposta resumir, marcar explicitamente como `top N`
- nao deixar um CC de fora do resumo curto parecer ausencia no resultado total

### JCI x Timesheet

Use este entendimento operacional:

- `Timesheet` = `Maua_Timesheet.php`
- `JCI` = conjunto operacional com `Funcionarios`, `Portaria`, `JC`, `CC`, `EAP`, `ProgressoOS`
- `Pendencias` = consolidado que ja conversa com portaria, JC e Timesheet
- `Maua_JC.php` = fonte operacional de origem do Job Card
- `Maua_Timesheet.php` = base receptora dos dados integrados do Job Card

Se o usuario pedir os dois bancos:

- sempre explicite qual numero vem de qual lado
- sempre diga a formula do cruzamento usado
- se `JC > Timesheet`, considerar primeiro atraso de integracao antes de concluir erro
- ao responder, separar:
  - lancado no `JC`
  - integrado no `Timesheet`
  - ainda nao integrado

### Pendencias por disciplina

Ordem padrao de leitura:

- primeiro `STATUS_JC`
- depois `disciplina`

Como derivar disciplina:

- usar `CHAPA` para correlacionar com `Maua_Funcionarios.php`
- usar `descr_ccusto` / `ccusto` de `Maua_Funcionarios.php` como fonte principal
- usar `DESCR_CCUSTO` de `Maua_Pendencias.php` apenas como fallback

Mapeamento operacional:

- `Estrutura / Acabamento - Reparo` -> `Estrutura - Reparo`
- `Estrutura / Acabamento - FEM` -> `Estrutura - FEM`
- `Estrutura / Acabamento - Construcao` -> `Estrutura - Construção`
- `Tratamento e Pintura - Reparo` ou `Tratamento e Pintura - Construcao` -> `Pintura`
- `Tubulações - Reparo` ou `Tubulações - Construcao` -> `Tubulação`
- `Máquinas - Reparo` ou `Maquinas - Construcao` -> `Mecânica`
- `Docagem` -> `Docagem`
- `Apoio Operacional` -> `Apoio Operacional`
- `Manutenção` -> conjunto de `ccusto` de manutenção definido nesta skill

## Observações Técnicas das APIs

### 1. Codificação (BOM)
As APIs do SCP Mauá (especialmente `Maua_Funcionarios.php` e `ApiMaua.php?op=consulta_madis`) podem retornar o cabeçalho **UTF-8 BOM**. Ao consumir via scripts, é mandatário tratar a decodificação (ex: `utf-8-sig` no Python).

### 2. Formato de Data (Portaria)
Na `ApiMaua.php?op=consulta_madis`, o campo `DT_REQUISICAO` é o timestamp completo preferencial. Para cruzamentos diários, o campo `DATA` já traz a data consolidada no formato `YYYY-MM-DD`.

### 3. Tipagem de Centro de Custo
O campo `ccusto` em `Maua_Funcionarios.php` pode ser retornado como inteiro em algumas situações. Para filtros de exclusão (como Manutenção), converta sempre para string antes da comparação.
