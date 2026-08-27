# Delegação por contexto e custo

Leia ao considerar delegação na estratégia ou antes de abrir um subagente durante a execução.

## Decidir

Execute diretamente por padrão. Com `sem subagentes`, ou sem essa capacidade no ambiente, mantenha o trabalho na sessão principal. Informe limitações quando afetarem a estratégia.

Delegue quando preservar contexto ou reduzir custo total compensar preparar instruções, transferir contexto, acompanhar, revisar e corrigir. A política de modelos orienta a escolha, mas não obriga delegação. Modelo mais barato reduz custo por token; delegar pode aumentar a quantidade de tokens. Use opções confirmadas, sem inventar economia.

| Trabalho | Preferência |
| --- | --- |
| Ajuste pequeno já compreendido, arquitetura, regra ambígua ou contexto caro de transferir | Sessão principal |
| Implementação repetitiva, com padrão e aceite claros | Bloco delegado a um modelo mais barato capaz |
| Leitura extensa ou investigação delimitada com síntese curta | Delegação para preservar contexto |

Informe o motivo antes de abrir cada agente. Sem opção de modelo mais barato, avalie apenas o benefício de contexto.

## Atribuir e revisar

Agrupe trabalho relacionado, inclusive várias fases, sem quantidade fixa de tarefas por agente. Reutilize o executor para correções e continuações do mesmo contexto. Paralelize apenas trabalho independente cujo benefício justifique o custo.

Forneça requisitos, limites, dependências, interfaces, aceite, verificações e referências do bloco, sem copiar a conversa inteira. Receba alterações, diff ou commits, provas, desvios e pendências; consulte logs completos quando necessário.

Os executores fazem o trabalho recebido, sem abrir outros agentes. A sessão principal decide, revisa, opera os hard gates e controla as escritas de acompanhamento. Devolva correções ao mesmo executor quando o contexto continuar útil.

A revisão fica na sessão principal, sem revisor ou crítico adicional automático. Se um gate exigir revisão independente incompatível com as preferências ou capacidades disponíveis, resolva o conflito com o usuário antes de avançar.
