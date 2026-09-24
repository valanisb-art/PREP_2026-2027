-- ============================================================================
-- Setup de auth local para prep_local
-- Extiende auth.users con columnas de credenciales (que el dump de Supabase no
-- trae) y siembra contraseñas locales conocidas para poder iniciar sesion.
-- ============================================================================

-- Asegurar esquema auth y tabla base
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);

-- Columnas necesarias para auth local
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data jsonb DEFAULT '{}'::jsonb;

-- Funcion auth.uid() stub (usada por policies; en local no aplica RLS real)
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

-- Asegurar que los usuarios del dump existen en auth.users
INSERT INTO auth.users (id, email) VALUES
  ('24d7f4fd-4c96-46ad-aa2d-892403e86fa1', 'victor.alanis@ieem.org.mx'),
  ('176ca873-8dfe-4bda-8649-abdfe0119170', 'alekei1200@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- Sembrar contraseñas locales conocidas (bcrypt de "prep2026").
-- Hash generado con bcryptjs, cost 10.
UPDATE auth.users
SET password_hash = '$2b$10$KUVUDDss/e6Jp9DEKFzjI.TybCETwIxNAlVulUx7rXZHBDCQX0KgC'
WHERE email IN ('victor.alanis@ieem.org.mx', 'alekei1200@gmail.com')
  AND password_hash IS NULL;
