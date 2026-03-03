-- Harden RLS policies by scoping data access to the caller's session id header.
-- Client requests must include x-session-id (set in src/integrations/supabase/client.ts).

create or replace function public.request_session_id()
returns text
language sql
stable
as $$
  select nullif((current_setting('request.headers', true)::json ->> 'x-session-id'), '');
$$;

create index if not exists idx_projects_session_id on public.projects(session_id);

-- github_tokens: block public table access. Only service role should read/write tokens.
drop policy if exists "Allow read by session_id" on public.github_tokens;
drop policy if exists "Allow insert" on public.github_tokens;
drop policy if exists "Allow update by session_id" on public.github_tokens;
drop policy if exists "Allow delete by session_id" on public.github_tokens;

create policy "Service role can read github_tokens"
on public.github_tokens
for select
using (auth.role() = 'service_role');

create policy "Service role can insert github_tokens"
on public.github_tokens
for insert
with check (auth.role() = 'service_role');

create policy "Service role can update github_tokens"
on public.github_tokens
for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role can delete github_tokens"
on public.github_tokens
for delete
using (auth.role() = 'service_role');

-- projects: session-scoped access only.
drop policy if exists "Anyone can read projects by session" on public.projects;
drop policy if exists "Anyone can insert projects" on public.projects;
drop policy if exists "Anyone can update projects" on public.projects;
drop policy if exists "Anyone can delete projects" on public.projects;

create policy "Session can read own projects"
on public.projects
for select
using (session_id = public.request_session_id());

create policy "Session can insert own projects"
on public.projects
for insert
with check (
  session_id = public.request_session_id()
  and session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

create policy "Session can update own projects"
on public.projects
for update
using (session_id = public.request_session_id())
with check (session_id = public.request_session_id());

create policy "Session can delete own projects"
on public.projects
for delete
using (session_id = public.request_session_id());

-- ai_tasks: session-scoped via parent project ownership.
drop policy if exists "Anyone can read tasks" on public.ai_tasks;
drop policy if exists "Anyone can insert tasks" on public.ai_tasks;
drop policy if exists "Anyone can update tasks" on public.ai_tasks;
drop policy if exists "Anyone can delete tasks" on public.ai_tasks;

create policy "Session can read own tasks"
on public.ai_tasks
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = ai_tasks.project_id
      and p.session_id = public.request_session_id()
  )
);

create policy "Session can insert own tasks"
on public.ai_tasks
for insert
with check (
  exists (
    select 1
    from public.projects p
    where p.id = ai_tasks.project_id
      and p.session_id = public.request_session_id()
  )
);

create policy "Session can update own tasks"
on public.ai_tasks
for update
using (
  exists (
    select 1
    from public.projects p
    where p.id = ai_tasks.project_id
      and p.session_id = public.request_session_id()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = ai_tasks.project_id
      and p.session_id = public.request_session_id()
  )
);

create policy "Session can delete own tasks"
on public.ai_tasks
for delete
using (
  exists (
    select 1
    from public.projects p
    where p.id = ai_tasks.project_id
      and p.session_id = public.request_session_id()
  )
);
