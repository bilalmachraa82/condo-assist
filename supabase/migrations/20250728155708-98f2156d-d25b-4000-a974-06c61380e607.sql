-- Criar política para permitir verificação de códigos mágicos por usuários anônimos
CREATE POLICY "Allow anonymous verification of magic codes" 
  ON public.supplier_magic_codes 
  FOR SELECT 
  TO anon
  USING (is_used = false AND expires_at > now());