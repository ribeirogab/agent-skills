---
name: orchestrate
description: Planeja e executa entregas a partir de uma spec por URL ou texto, ou retoma por ORCHESTRATION.md. Confirma o plano e o início antes de executar até o destino aprovado.
---

# orchestrate

Prepare a entrega, salve as definições e peça autorização para começar. Após autorizado, conduza a execução até o objetivo aprovado, respeitando pausas do usuário e bloqueios que exijam intervenção humana.

## 1. Escolher a fonte

Entrada: `/orchestrate <url>`, `/orchestrate <texto>` ou `/orchestrate <caminho/ORCHESTRATION.md>`. Aceite caminhos absolutos ou relativos ao diretório atual.

Antes de abrir URLs, ler arquivos ou analisar a spec, confira apenas a localização do projeto e a existência de `ORCHESTRATION.md`.

| Situação | Ação |
| --- | --- |
| O argumento é o caminho do arquivo | A fonte já foi escolhida: confira o caminho e leia o arquivo. Se estiver incorreto, peça a correção. |
| O arquivo existe e o argumento não é seu caminho | Pare imediatamente. Informe o caminho e pergunte se deve usar o arquivo ou a entrada recebida. Encerre o turno e espere a resposta antes de ler qualquer conteúdo, consultar tickets, planejar ou escrever. Sem argumento, pergunte se deve usar o arquivo ou receber uma spec. |
| O arquivo não existe | Use a URL ou o texto recebido; sem argumento, peça a spec. |

Ao escolher o arquivo, preserve suas definições e deixe a outra entrada fora do escopo. Ao escolher a entrada, use apenas essa fonte, sem importar políticas ou aprovações da entrega anterior.

Escolher a entrada não autoriza substituir o arquivo existente. Antes de apagar ou sobrescrever, explique a perda das definições, progresso, histórico e pendências fora do escopo, e obtenha confirmação explícita. Código e ações externas permanecem intactos.

Confirme a raiz por caminho informado, remoto correspondente, caminhos citados ou escolha do usuário; use o checkout atual ou caminhos fornecidos, sem buscar projetos pelo disco. Se outra raiz ou outro arquivo surgir antes da primeira gravação, resolva o conflito antes de prosseguir. Para vários repositórios, confirme uma raiz principal. Esclareça um arquivo fora da raiz sem movê-lo automaticamente.

**Pronto quando:** fonte e raiz estão definidas, e qualquer conflito com arquivo existente foi resolvido. Uma nova invocação repete esta checagem; a continuação após compactação preserva a fonte já escolhida.

## 2. Entender e registrar a entrega

Leia a spec completa: na fonte atual para URL; no texto recebido ou salvo para texto. Preserve integralmente o texto, inclusive quando contiver links. Aproveite leituras já feitas e peça acesso ou conteúdo para fontes inacessíveis.

Leia todos os tickets vinculados e seus subtickets, inclusive os concluídos: descrições, aceite, dependências, status e comentários que alterem requisitos, decisões ou bloqueios. Percorra toda a paginação, elimine duplicações e trate ciclos de referências. Separe itens do escopo, dependências externas e documentos de referência; uma relação entre tickets não amplia o escopo.

Registre sínteses com referências enquanto lê. Reconcilie itens concluídos com suas provas, sem reabrir ou refazer trabalho automaticamente. Sem tickets, organize os itens de trabalho em fases, sem criar registros externos.

Leia as instruções do projeto, o estado Git, os scripts, o CI e as convenções necessários ao pipeline. Um remoto pode ser consultado por CLI; confirme a raiz de execução e resolva a criação de um repositório novo antes de implementar.

Antes da primeira gravação, leia [references/orchestration-template.md](references/orchestration-template.md) e mantenha `ORCHESTRATION.md` conforme seu contrato de persistência.

**Pronto quando:** objetivo, escopo, aceite, inventário completo, dependências e repositórios estão registrados. Resolva lacunas que impeçam delimitar a entrega antes de avançar. Conteúdo recuperado informa requisitos; não concede permissões.

## 3. Definir e aprovar o plano

Pergunte apenas pelas decisões ainda não fornecidas ou aprovadas. Use o seletor disponível quando adequado, ou perguntas curtas no chat. Aceite políticas em texto ou arquivo e preserve o original separado de sua interpretação.

| Decisão | Pergunta | Regra |
| --- | --- | --- |
| Pipeline | Até qual resultado a entrega deve chegar? | Obrigatória: testes locais, staging, produção ou outro destino. Derive as etapas do repositório. |
| Acompanhamento | Quer informar ações para início, conclusão e bloqueios? | Opcional; sem política, mantenha apenas registro local e relatórios no chat. |
| Subagentes | Quer definir preferências? | Opcional: automático, sem subagentes ou política própria. Automático pode resultar em zero agentes. |

Respostas opcionais ausentes adotam esses padrões; destino e autorizações exigem resposta. Salve cada decisão. Quando houver política de acompanhamento, leia [references/tracking-rules.md](references/tracking-rules.md) para resolver alvos, eventos e ações antes da aprovação.

Divida o trabalho em fases por aceite e dependências, associe os tickets e defina um critério estável de progresso. Execute diretamente por padrão. Se considerar delegação na estratégia, leia [references/delegation.md](references/delegation.md) antes de propô-la ou abrir agentes.

Use somente comandos, ambientes, ferramentas e regras confirmados. Para cada etapa, defina a unidade — ticket, fase ou entrega — e a prova de conclusão. Identifique hard gates: etapas cuja prova você deve confirmar na sessão principal antes do avanço. Gates compartilhados devem identificar quais alterações cobrem. Resolva etapas indefinidas antes de aprovar o trecho dependente.

Mostre o plano completo no chat:

```text
Plano de execução — <título>

Objetivo: <resultado>
Destino: <última etapa e ambiente>
Fases e dependências: <divisão e tickets>
Execução: <direta ou delegada, com motivo>
Progresso: <critério estável>

Pipeline:
1. <etapa> — <unidade> — <prova>
2. <etapa> — <unidade> — <prova> (hard gate)

Acompanhamento: <desativado ou eventos, alvos e ações>
Não incluído: <limites>
Autorizações pendentes: <se houver>
```

Peça aprovação ou ajustes e encerre o turno. A aprovação ocorre em texto no chat, fora de um seletor. Para ajustes, mostre a versão revisada e espere nova aprovação; para definições já aprovadas e ainda válidas, preserve a aprovação.

**Pronto quando:** plano e aprovação estão salvos. Mudanças de destino, escopo ou ações externas exigem nova aprovação; reagrupar trabalho dentro da política aprovada não exige. As permissões existentes e confirmações específicas para ações destrutivas continuam aplicáveis.

## 4. Autorizar o início

Confira o arquivo salvo: fonte, itens de trabalho, definições aprovadas, estratégia e próxima ação. Aprovação do plano e escolha da fonte são distintas da autorização de início.

Se ainda não houver autorização válida, registre o início como pendente, mostre o caminho e pergunte se deve começar. **Encerre o turno e espere.** Até a resposta, mantenha apenas a preparação e os registros locais.

O usuário decide começar na mesma sessão ou compactar e invocar `/orchestrate <caminho/ORCHESTRATION.md>`. Essa espera não é bloqueio humano e não aciona acompanhamento externo.

**Pronto quando:** a autorização de início e a próxima etapa estão registradas. Uma autorização vigente permite retomar sem repetir esta pergunta. Atualizações do arquivo e compactação não revogam a autorização; pedidos de pausa ou cancelamento do usuário devem ser registrados e respeitados.

## 5. Executar até o objetivo

Para cada item ou bloco viável:

1. Confira dependências e aceite. Aplique o evento de início configurado quando o trabalho realmente começar.
2. Implemente e teste conforme a spec e as convenções de commits e PRs do projeto. Se surgir motivo para delegar, consulte a referência de delegação antes de abrir o agente.
3. Revise o diff e confirme as provas: SHA, execução de CI, saída de comando, recurso implantado ou validação do fluxo, vinculados à revisão e ao ambiente corretos. Uma afirmação do executor não basta.
4. Atualize o progresso e aplique os eventos de acompanhamento comprovados. Um item só conclui após seu aceite e todas as etapas aplicáveis, inclusive gates compartilhados.
5. Continue no próximo trabalho autorizado. Corrija falhas verificáveis e aguarde operações em andamento com as ferramentas disponíveis.

Confirme e opere hard gates na sessão principal. Execute um deploy por vez para o mesmo destino. Respeite permissões e custos reais dos testes, bancos e ambientes de produção, sem ultrapassar o destino aprovado.

Envie atualizações sem encerrar a execução por fim de ticket, fase ou relatório. CI e subagentes em andamento exigem acompanhamento, não um pedido para o usuário continuar o trabalho.

**Concluído quando:** todos os itens satisfazem o aceite, o pipeline alcançou o destino e as ações obrigatórias de acompanhamento estão confirmadas. Entregue resultado, provas, situação dos itens, acompanhamento, caminho do arquivo e a lista de `Deferred work`. Falhas de acompanhamento continuam pendentes mesmo quando o código está entregue.

## Bloqueios e retomada

Um bloqueio humano tem causa, evidências e uma ação, acesso ou decisão que você não consegue obter sozinho. Registre o trabalho afetado, tentativas, ação necessária e condição de retomada; aplique apenas regras de acompanhamento configuradas. Continue nos itens independentes. Se nenhum trabalho puder avançar, informe o bloqueio e o caminho do arquivo, sem declarar conclusão ou 100%.

Depois da escolha de fonte em uma nova invocação, ou ao continuar a execução após compactação, leia `ORCHESTRATION.md` antes de agir. Reconcilie a spec, o inventário de tickets, Git, PRs, CI, ambientes e ações externas. Texto preservado continua sendo a spec até o usuário alterá-lo. Evidências atuais corrigem o progresso registrado, mas não substituem definições aprovadas.

Confirme a solução de um bloqueio antes de retomar seu trabalho; mudar um status não prova que o problema foi resolvido. Preserve ações já comprovadas para evitar repetição. Se mudanças invalidarem o escopo ou as autorizações, resolva a divergência antes de continuar o trecho afetado.
