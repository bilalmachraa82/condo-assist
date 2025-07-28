-- Criar política RLS para permitir que admins possam apagar assistências
CREATE POLICY "Admins can delete assistances" 
  ON public.assistances 
  FOR DELETE 
  USING (is_admin(auth.uid()));