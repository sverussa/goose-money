-- Roda uma vez, quando o volume do banco é criado (migrate.sh da imagem supabase/postgres).
-- Dá aos papéis do Supabase a senha de POSTGRES_PASSWORD, como a Supabase CLI faz.
\set pgpass `echo "$PGPASSWORD"`

ALTER USER postgres WITH PASSWORD :'pgpass';
ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
