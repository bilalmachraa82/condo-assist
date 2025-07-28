-- Fase 1: Correções Fundamentais

-- 1. Aumentar validade do magic code para 7 dias (modificar função existente)
CREATE OR REPLACE FUNCTION public.generate_magic_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    -- Generate 6 character alphanumeric code
    code := upper(substr(md5(random()::text), 1, 6));
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM public.supplier_magic_codes 
      WHERE magic_code = code AND expires_at > now()
    ) INTO exists_code;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_code;
  END LOOP;
  
  RETURN code;
END;
$function$;

-- 2. Adicionar novos campos para gerenciar melhor o fluxo
ALTER TABLE assistances 
ADD COLUMN IF NOT EXISTS scheduled_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS scheduled_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS estimated_duration_hours integer,
ADD COLUMN IF NOT EXISTS actual_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS actual_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS progress_notes text,
ADD COLUMN IF NOT EXISTS requires_validation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS validated_by uuid,
ADD COLUMN IF NOT EXISTS validated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completion_photos_required boolean DEFAULT true;

-- 3. Expandir tipos de status para incluir novos estados intermédios
-- Primeiro verificar se o tipo já existe e adicionar novos valores se necessário
DO $$
BEGIN
    -- Adicionar novos status se não existirem
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'accepted' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assistance_status')
    ) THEN
        ALTER TYPE assistance_status ADD VALUE 'accepted';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'scheduled' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assistance_status')
    ) THEN
        ALTER TYPE assistance_status ADD VALUE 'scheduled';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'awaiting_validation' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assistance_status')
    ) THEN
        ALTER TYPE assistance_status ADD VALUE 'awaiting_validation';
    END IF;
END$$;

-- 4. Melhorar tabela de supplier_responses para incluir dados de agendamento
ALTER TABLE supplier_responses 
ADD COLUMN IF NOT EXISTS scheduled_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS scheduled_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS estimated_duration_hours integer,
ADD COLUMN IF NOT EXISTS response_comments text;

-- 5. Criar tabela para progresso e comunicações durante a assistência
CREATE TABLE IF NOT EXISTS assistance_progress (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assistance_id uuid NOT NULL,
    supplier_id uuid,
    progress_type text NOT NULL, -- 'comment', 'photo', 'status_update', 'issue'
    title text,
    description text,
    photo_urls text[],
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. Enable RLS na nova tabela
ALTER TABLE assistance_progress ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para assistance_progress
CREATE POLICY "Admins can manage assistance progress" 
ON assistance_progress 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Authenticated users can view assistance progress" 
ON assistance_progress 
FOR SELECT 
USING (true);

-- 8. Atualizar trigger para progress updates
CREATE OR REPLACE FUNCTION public.update_updated_at_assistance_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_assistance_progress_updated_at
BEFORE UPDATE ON assistance_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_assistance_progress();

-- 9. Função para verificar se assistência está pronta para conclusão
CREATE OR REPLACE FUNCTION public.can_complete_assistance(assistance_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assistance_record RECORD;
  required_photos_count INT;
  uploaded_photos_count INT;
BEGIN
  -- Get assistance details
  SELECT * INTO assistance_record 
  FROM assistances 
  WHERE id = assistance_id_param;
  
  -- If completion photos are required, check if they exist
  IF assistance_record.completion_photos_required THEN
    SELECT COUNT(*) INTO uploaded_photos_count
    FROM assistance_photos 
    WHERE assistance_id = assistance_id_param 
    AND photo_type = 'completion';
    
    -- Require at least 1 completion photo
    IF uploaded_photos_count < 1 THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- If requires validation, check if validated
  IF assistance_record.requires_validation AND assistance_record.validated_at IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;