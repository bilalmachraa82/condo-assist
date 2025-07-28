-- Criar bucket para fotos de assistência
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assistance-photos', 
  'assistance-photos', 
  true, 
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
);

-- Criar políticas para o bucket assistance-photos
CREATE POLICY "Todos podem ver fotos de assistência" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'assistance-photos');

CREATE POLICY "Fornecedores podem fazer upload de fotos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'assistance-photos');

CREATE POLICY "Fornecedores podem atualizar suas fotos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'assistance-photos');

CREATE POLICY "Admins podem deletar fotos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'assistance-photos' AND is_admin(auth.uid()));