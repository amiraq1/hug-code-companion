
-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read projects by session" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update projects" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete projects" ON public.projects FOR DELETE USING (true);

-- Create AI tasks table
CREATE TABLE public.ai_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  estimated_hours NUMERIC(5,1),
  deadline_days INTEGER,
  assignee TEXT DEFAULT 'غير محدد',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  step_order INTEGER NOT NULL DEFAULT 0,
  parent_task_id UUID REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tasks" ON public.ai_tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tasks" ON public.ai_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tasks" ON public.ai_tasks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tasks" ON public.ai_tasks FOR DELETE USING (true);

-- Index for performance
CREATE INDEX idx_ai_tasks_project_id ON public.ai_tasks(project_id);
CREATE INDEX idx_ai_tasks_parent ON public.ai_tasks(parent_task_id);
