# Pendencias Logic

## Como ler `Maua_Pendencias.php`

O retorno vem como objeto:

- `avisos`
- `total`
- `dados`

`dados` e a lista de pendencias.

## Classificacao operacional

Nao trate `PENDENCIA` como categoria textual.

Leia o trio:

- `STATUS_PORTARIA`
- `STATUS_JC`
- `PENDENCIA`

## Valores observados

### `STATUS_PORTARIA`

- `Com Acesso`
- `Sem Acesso`

### `STATUS_JC`

- `Sem JC`
- `Com JC - Sem Baixa`
- `Com JC - Baixa Parcial`
- `Com TS - Baixa Parcial`
- `Com TS - Sem Baixa`

### `PENDENCIA`

- saldo numerico
- pode ser inteiro, decimal ou negativo
- exemplos observados: `9`, `8`, `11`, `7`, `1`, `0.01`, `-8`, `-7`, `-1`

## Leituras uteis

- `Sem Acesso` + `Sem JC`: forte candidato a falta ou ausencia sem lancamento
- `Com Acesso` + `Sem JC`: pessoa entrou mas nao gerou JC
- `Com Acesso` + `Com JC - Sem Baixa`: houve JC sem baixa suficiente
- `Com Acesso` + `Com TS - Baixa Parcial`: houve Timesheet, mas a baixa ficou parcial
- valores negativos em `PENDENCIA`: nao assumir erro; reportar como saldo negativo observado

## Agrupamento recomendado

Para analise operacional, agrupar nesta ordem:

1. `STATUS_JC`
2. `disciplina`

## Disciplina

Para `Pendencias`, derive `disciplina` primeiro pela correlacao de `CHAPA` com `Maua_Funcionarios.php`.

Fonte principal:

- `Maua_Funcionarios.descr_ccusto`
- `Maua_Funcionarios.ccusto`

Fallback:

- `Maua_Pendencias.DESCR_CCUSTO`

Mapeamento operacional:

- `Estrutura / Acabamento - Reparo` -> `Estrutura - Reparo`
- `Estrutura / Acabamento - FEM` -> `Estrutura - FEM`
- `Estrutura / Acabamento - Construcao` -> `Estrutura - Construção`
- `Tratamento e Pintura - Reparo` ou `Tratamento e Pintura - Construcao` -> `Pintura`
- `Tubulações - Reparo` ou `Tubulações - Construcao` -> `Tubulação`
- `Máquinas - Reparo` ou `Maquinas - Construcao` -> `Mecânica`
- `Docagem` -> `Docagem`
- `Apoio Operacional` -> `Apoio Operacional`
- `ccusto` de `Manutenção` definidos na skill, incluindo `Ferramentaria` -> `Manutenção`

## Avisos

Sempre leia `avisos`.

Ja foi observado:

- `API Convocados nao trouxe registros ou falhou no parse JSON.`

Portanto:

- mesmo com `dados` preenchido, a resposta pode estar avisando perda parcial de fonte auxiliar
- o total pode variar no mesmo dia para o mesmo periodo; trate `Pendencias` como snapshot vivo e sempre consulte ao vivo
