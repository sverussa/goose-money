-- A V001 criou set_updated_at() antes de tirar o `execute` padrão de PUBLIC (D57), e o `anon`
-- ficou com ele. Função de trigger não pode ser chamada direto, mas a regra vale para todas
-- (T02-11 confere pelo catálogo).
revoke execute on function public.set_updated_at() from public, anon, authenticated;
