-- Crear 2 usuarios administradores adicionales con contraseña local "prep2026".
-- Idempotente: si ya existen (por email), no los duplica.
BEGIN;

-- Usuario 1: aldo.acevedo@ieem.org.mx
INSERT INTO auth.users (id, email, password_hash, raw_user_meta_data)
SELECT gen_random_uuid(), 'aldo.acevedo@ieem.org.mx',
       '$2b$10$KUVUDDss/e6Jp9DEKFzjI.TybCETwIxNAlVulUx7rXZHBDCQX0KgC',
       jsonb_build_object('full_name', 'Aldo Acevedo')
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = 'aldo.acevedo@ieem.org.mx');

-- Usuario 2: jorgeisacctalita@gmail.com
INSERT INTO auth.users (id, email, password_hash, raw_user_meta_data)
SELECT gen_random_uuid(), 'jorgeisacctalita@gmail.com',
       '$2b$10$KUVUDDss/e6Jp9DEKFzjI.TybCETwIxNAlVulUx7rXZHBDCQX0KgC',
       jsonb_build_object('full_name', 'Jorge Isaac')
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = 'jorgeisacctalita@gmail.com');

-- Perfiles (profiles.id = auth.users.id)
INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, u.raw_user_meta_data->>'full_name', u.email
FROM auth.users u
WHERE u.email IN ('aldo.acevedo@ieem.org.mx', 'jorgeisacctalita@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- Roles admin
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE u.email IN ('aldo.acevedo@ieem.org.mx', 'jorgeisacctalita@gmail.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'::public.app_role
  );

COMMIT;
