# Regras de acompanhamento

Leia quando houver política de acompanhamento a configurar ou ações configuradas a executar ou reconciliar. Sem política aprovada, mantenha apenas registros locais e relatórios no chat.

## Configurar

Preserve a política original em `Approved decisions / Tracking rules`. Para cada regra, defina evento, condição e prova, serviço e recursos afetados, ação, conteúdo permitido e forma de confirmar o resultado.

Consulte o serviço para resolver contas, times, projetos, campos e status para identificadores reais. Peça esclarecimento para nomes ausentes ou ambíguos, sem criar valores para acomodar a política. Uma regra de subticket não se estende ao pai; sua conclusão exige regra explícita e cumprimento dos critérios de todos os itens necessários.

Se um status representar uma etapa intermediária, associe-o a esse evento e mantenha separado o avanço técnico. O nome do status não altera o destino aprovado.

**Pronto quando:** mapeamento, alvos e alcance das escritas estão aprovados no plano. A aplicação depende também da autorização de início. A espera entre preparação e execução não gera eventos de bloqueio ou conclusão.

## Aplicar e confirmar

A sessão principal executa as ações, usando as evidências dos executores.

1. Confirme o evento com provas e leia o recurso atual. Reconcilie mudanças humanas antes de sobrescrever decisões.
2. Consulte as ações anteriores e registre a intenção em `Progress / Tracking actions`: recurso, evento e evidência, ação esperada.
3. Execute somente a ação aprovada. Confirme valores já corretos sem reescrevê-los. Para comentários, procure a ação anterior pelo ID ou pelo conteúdo e evento; use idempotência quando disponível.
4. Consulte o resultado e registre sua referência. Diante de resposta incerta, confira a fonte antes de repetir.

**Pronto quando:** cada ação tem resultado confirmado. Status e comentário são operações separadas; retome apenas a parte pendente. Uma falha de integração mantém pendência de acompanhamento, sem invalidar provas técnicas. Continue o trabalho independente.

## Bloqueio humano

Aplique a regra apenas aos recursos afetados. O comentário deve conter bloqueio, evidências, tentativas, ação humana necessária e condição de retomada, sem credenciais ou logs sensíveis.

Após verificar a solução, aplique a transição de retomada configurada, considerando o estado atual. Preserve mudanças humanas em vez de restaurar cegamente um status antigo.

Alterar status ou comentar não desperta uma sessão encerrada. A retomada depende de nova entrada ou invocação; monitoramento exige solicitação e configuração próprias.

## Exemplo opcional: Linear

Esta política é um exemplo de entrada do usuário, não um padrão:

```text
Para os subtickets desta spec:
- Ao iniciar, mude para In Progress.
- Ao cumprir o aceite e o pipeline aplicáveis, mude para Done e comente as provas.
- Em bloqueio que exija humano, mude para Needs Human e comente causa, tentativas e ação necessária.
- Após verificar a solução e retomar, mude para In Progress.
- Preserve o ticket pai e os demais campos.
```

Antes de ativar, confirme os subtickets, o time, os IDs dos status, as permissões e o mapeamento aprovado. Se um status não existir, peça o nome correto. A prova de conclusão deve corresponder ao destino aprovado, seja staging, produção ou outro.
