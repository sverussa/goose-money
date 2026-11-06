-- carregar_tudo() filtra cada tabela por `created_by = auth.uid() and not is_deleted` (T00-14).
-- Com o banco cheio de outros usuários, o `explain` mostrou varredura completa nestas tabelas: o
-- índice que começa por created_by não existia ou tinha outro predicado (`not arquivada`, `tipo`).
-- Em produção todos os usuários dividem as mesmas tabelas, então o índice vale lá também.
create index contas_por_dono on public.contas (created_by) where not is_deleted;
create index cartoes_por_dono on public.cartoes (created_by) where not is_deleted;
create index compras_por_dono on public.compras (created_by) where not is_deleted;
create index itens_fatura_por_dono on public.itens_fatura (created_by) where not is_deleted;
create index dividas_por_dono on public.dividas (created_by) where not is_deleted;
-- Fazia uma varredura inteira de recorrencias_id_created_by_key (id, created_by).
create index recorrencias_por_dono on public.recorrencias (created_by) where not is_deleted;
