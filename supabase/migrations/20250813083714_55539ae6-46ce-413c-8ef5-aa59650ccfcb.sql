-- Enable realtime for assistances table to ensure instant updates
ALTER TABLE public.assistances REPLICA IDENTITY FULL;

-- Add assistances table to realtime publication if not already added
DO $$
BEGIN
    -- Check if table is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'assistances'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.assistances;
    END IF;
END
$$;

-- Enable realtime for quotations table to ensure instant updates  
ALTER TABLE public.quotations REPLICA IDENTITY FULL;

-- Add quotations table to realtime publication if not already added
DO $$
BEGIN
    -- Check if table is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'quotations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.quotations;
    END IF;
END
$$;