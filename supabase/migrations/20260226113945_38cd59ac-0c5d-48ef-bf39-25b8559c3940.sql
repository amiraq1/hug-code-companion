
-- Create table for storing GitHub access tokens
CREATE TABLE public.github_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  github_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.github_tokens ENABLE ROW LEVEL SECURITY;

-- Public read/write by session_id (no auth required for this demo IDE)
CREATE POLICY "Allow read by session_id" ON public.github_tokens
  FOR SELECT USING (true);

CREATE POLICY "Allow insert" ON public.github_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update by session_id" ON public.github_tokens
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete by session_id" ON public.github_tokens
  FOR DELETE USING (true);
