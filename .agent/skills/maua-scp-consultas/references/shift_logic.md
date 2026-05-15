# Lógica de Detecção de Turnos

Para compensar a ausência ou inconsistência do campo `turno` no cadastro de funcionários, deve-se utilizar a heurística baseada nos padrões de acesso reais.

## Turno Noturno

Um colaborador é classificado como **Turno Noturno** se apresentar pelo menos **2 das 3** marcações abaixo em um ciclo operacional:

1.  **Entrada:** Registro de acesso entre **18:00** e **23:59**.
2.  **Refeição:** Registro (ponto ou refeitório) por volta das **00:00**.
3.  **Saída:** Registro de saída/acesso entre **04:00** e **05:30**.

## Turno Diurno

Um colaborador é classificado como **Turno Diurno** se apresentar marcações predominantes dentro da seguinte faixa:

-   **Acesso Inicial:** A partir das **05:30**.
-   **Saída Normal:** Por volta das **17:00**, podendo se estender até **20:00**.
-   **Intercalares:** Diversas marcações (relógio de ponto, refeição) entre **07:00** e **16:00**.

## Regras de Processamento

1.  **Prioridade do Padrão Real:** A marcação de acesso/ponto física prevalece sobre o campo `turno` do sistema em caso de divergência clara.
2.  **Busca por Histórico:** Caso a matrícula (chapa) não possua registros no dia atual que permitam a classificação, deve-se consultar o dia anterior mais próximo para confirmar o turno habitual do colaborador.
3.  **Corte de Ausência:**
    *   Para o **Diurno**, considerar ausência se não houver acesso após as 05:30.
    *   Para o **Noturno**, considerar ausência se não houver acesso a partir das 18:00 (ciclo inicia na noite anterior ou no dia atual conforme a visão da consulta).

## Exclusão de Acesso Residual
Ao calcular ausências do **Turno Diurno**, ignorar marcações de saída de colaboradores do **Turno Noturno** que ocorram entre **00:00** e **05:30**.
