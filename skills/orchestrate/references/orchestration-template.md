# ORCHESTRATION.md

Leia antes da primeira gravação. Mantenha um único arquivo com esse nome na raiz confirmada do projeto; para vários repositórios, registre os demais caminhos nele.

## Persistência

Antes de criar ou atualizar o arquivo, garanta `/ORCHESTRATION.md` no `.gitignore` da raiz, sem duplicar a entrada ou alterar outras regras. Confira que o arquivo está ignorado e não é rastreado; mantenha-o fora dos commits. Se já for rastreado, peça autorização específica para removê-lo do índice; o ignore sozinho não resolve. Sem Git inicializado, mantenha a regra e verifique-a após criar o repositório.

Atualize o arquivo após descoberta, decisões, autorização de início, etapas, ações externas, bloqueios e antes de devolver o controle. Registre pausas e cancelamentos. Preserve políticas e aprovações; use referências para logs e provas, sem gravar credenciais.

## Estrutura

Use `# Orchestration` como título e as seções abaixo como títulos de segundo nível. Preencha com fatos e marque propostas como pendentes.

| Seção | Conteúdo |
| --- | --- |
| Spec | URL ou texto integral; objetivo, escopo, exclusões, aceite, raiz, repositórios e versões das fontes. Inventário de tickets e subtickets com links, relações e dependências; referências externas e lacunas separadas. Sem tickets, registre os itens de trabalho. |
| Approved decisions | Subdivida em Pipeline, Tracking rules, Subagents e Start authorization. Registre definições efetivas, políticas originais, interpretações aprovadas, limites, capacidades confirmadas, datas e respostas do usuário. Separe aprovação do plano e autorização de início. |
| Execution strategy | Fases, dependências, execução direta ou blocos delegados, motivos e critério estável de progresso. Inclua referências dos agentes e confira sua disponibilidade ao retomar. |
| Progress | Por item: status externo, etapa, resultado, revisão ou recurso e prova. Mantenha o status externo separado do avanço técnico. |
| Blockers | Trabalho afetado, causa, provas, tentativas, ação humana, condição de retomada, acompanhamento e trabalho independente viável. |
| Next action | Próxima ação concreta, operações em andamento, verificações e autorizações pendentes, com data. Antes do início, registre a espera por autorização; depois, a próxima etapa viável. |
| Decision history | Data, mudança, motivo e aprovação. Preserve decisões anteriores; as definições vigentes ficam em Approved decisions. |
| Deferred work | Descobertas fora do escopo: o que são, onde estão e por que ficaram de fora. Registre ao descobrir; mantenha aceite e falhas do pipeline em Progress ou Blockers. |

Em `Progress / Tracking actions`, registre intenções e resultados externos: recurso, evento e evidência, ação, resultado, referência externa e próxima ação. Diferencie pendente, confirmado e incerto.

`Deferred work` fica apenas neste arquivo, fora do percentual e sem ampliar o escopo. Publique a lista externamente somente por regra confirmada. A exclusão do arquivo também elimina essas pendências.
