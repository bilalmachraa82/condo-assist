-- Enable realtime for assistances and quotations tables
ALTER TABLE public.assistances REPLICA IDENTITY FULL;
ALTER TABLE public.quotations REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.assistances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotations;