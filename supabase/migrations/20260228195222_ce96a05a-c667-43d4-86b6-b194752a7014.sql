
CREATE TABLE public.waitlist_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  practice_name TEXT NOT NULL,
  email TEXT NOT NULL,
  jane_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public form)
CREATE POLICY "Anyone can submit waitlist form"
  ON public.waitlist_submissions
  FOR INSERT
  WITH CHECK (true);
