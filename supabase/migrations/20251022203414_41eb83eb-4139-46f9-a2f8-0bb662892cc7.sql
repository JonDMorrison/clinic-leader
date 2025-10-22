-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create AI insights table
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI agendas table
CREATE TABLE public.ai_agendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id),
  week_start DATE NOT NULL,
  agenda JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI logs table
CREATE TABLE public.ai_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('insight', 'agenda', 'issue', 'forecast', 'benchmark', 'chat')),
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vector docs table for embeddings
CREATE TABLE public.vector_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id UUID REFERENCES public.docs(id) ON DELETE CASCADE,
  chunk TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vector_docs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_insights
CREATE POLICY "Admins can manage ai_insights"
  ON public.ai_insights
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can read ai_insights"
  ON public.ai_insights
  FOR SELECT
  USING (true);

-- RLS Policies for ai_agendas
CREATE POLICY "Admins can manage ai_agendas"
  ON public.ai_agendas
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Managers can manage team ai_agendas"
  ON public.ai_agendas
  FOR ALL
  USING (is_manager() AND is_same_team(team_id))
  WITH CHECK (is_manager() AND is_same_team(team_id));

CREATE POLICY "Team members can read ai_agendas"
  ON public.ai_agendas
  FOR SELECT
  USING (is_same_team(team_id));

-- RLS Policies for ai_logs
CREATE POLICY "Admins can manage ai_logs"
  ON public.ai_logs
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can read ai_logs"
  ON public.ai_logs
  FOR SELECT
  USING (true);

-- RLS Policies for vector_docs
CREATE POLICY "Admins can manage vector_docs"
  ON public.vector_docs
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can read vector_docs"
  ON public.vector_docs
  FOR SELECT
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_ai_insights_week_start ON public.ai_insights(week_start DESC);
CREATE INDEX idx_ai_agendas_team_week ON public.ai_agendas(team_id, week_start DESC);
CREATE INDEX idx_ai_logs_type_created ON public.ai_logs(type, created_at DESC);
CREATE INDEX idx_vector_docs_doc_id ON public.vector_docs(doc_id);