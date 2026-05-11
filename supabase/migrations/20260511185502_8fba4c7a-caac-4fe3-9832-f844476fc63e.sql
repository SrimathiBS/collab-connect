CREATE TYPE public.project_status AS ENUM ('active', 'completed');

ALTER TABLE public.projects
  ADD COLUMN status public.project_status NOT NULL DEFAULT 'active',
  ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;