-- Criar política para permitir acesso anônimo de leitura aos fornecedores ativos
CREATE POLICY "Allow anonymous read of active suppliers" 
  ON public.suppliers 
  FOR SELECT 
  TO anon
  USING (is_active = true);