
CREATE TYPE public.task_status AS ENUM ('pending', 'completed');

CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL,
  assigned_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status public.task_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX idx_project_tasks_assignee ON public.project_tasks(assigned_to);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or assignee can view tasks"
ON public.project_tasks FOR SELECT TO authenticated
USING (
  auth.uid() = assigned_to
  OR public.is_project_owner(project_id, auth.uid())
);

CREATE POLICY "Owner can create tasks"
ON public.project_tasks FOR INSERT TO authenticated
WITH CHECK (
  public.is_project_owner(project_id, auth.uid())
  AND auth.uid() = assigned_by
);

CREATE POLICY "Owner can update any task; assignee can update their own"
ON public.project_tasks FOR UPDATE TO authenticated
USING (
  public.is_project_owner(project_id, auth.uid())
  OR auth.uid() = assigned_to
);

CREATE POLICY "Owner can delete tasks"
ON public.project_tasks FOR DELETE TO authenticated
USING (public.is_project_owner(project_id, auth.uid()));

CREATE TRIGGER project_tasks_updated_at
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
