-- Script simplificado para limpar fornecedores duplicados
-- Manter o mais recente de cada email

-- 1. Criar tabela temporária com IDs dos fornecedores a manter
CREATE TEMP TABLE suppliers_to_keep AS
SELECT DISTINCT ON (email) id, email
FROM suppliers 
WHERE email IS NOT NULL AND email != ''
ORDER BY email, created_at DESC;

-- 2. Criar tabela temporária com IDs dos fornecedores a remover
CREATE TEMP TABLE suppliers_to_delete AS
SELECT s.id, s.email
FROM suppliers s
WHERE s.email IS NOT NULL AND s.email != ''
AND s.id NOT IN (SELECT id FROM suppliers_to_keep);

-- 3. Atualizar referências nas assistências
UPDATE assistances 
SET assigned_supplier_id = (
  SELECT stk.id 
  FROM suppliers_to_keep stk
  JOIN suppliers_to_delete std ON std.email = stk.email
  WHERE std.id = assistances.assigned_supplier_id
)
WHERE assigned_supplier_id IN (SELECT id FROM suppliers_to_delete);

-- 4. Atualizar referências nas respostas de fornecedores
UPDATE supplier_responses 
SET supplier_id = (
  SELECT stk.id 
  FROM suppliers_to_keep stk
  JOIN suppliers_to_delete std ON std.email = stk.email
  WHERE std.id = supplier_responses.supplier_id
)
WHERE supplier_id IN (SELECT id FROM suppliers_to_delete);

-- 5. Atualizar referências nos códigos mágicos
UPDATE supplier_magic_codes 
SET supplier_id = (
  SELECT stk.id 
  FROM suppliers_to_keep stk
  JOIN suppliers_to_delete std ON std.email = stk.email
  WHERE std.id = supplier_magic_codes.supplier_id
)
WHERE supplier_id IN (SELECT id FROM suppliers_to_delete);

-- 6. Atualizar referências nos orçamentos
UPDATE quotations 
SET supplier_id = (
  SELECT stk.id 
  FROM suppliers_to_keep stk
  JOIN suppliers_to_delete std ON std.email = stk.email
  WHERE std.id = quotations.supplier_id
)
WHERE supplier_id IN (SELECT id FROM suppliers_to_delete);

-- 7. Atualizar referências no progresso das assistências
UPDATE assistance_progress 
SET supplier_id = (
  SELECT stk.id 
  FROM suppliers_to_keep stk
  JOIN suppliers_to_delete std ON std.email = stk.email
  WHERE std.id = assistance_progress.supplier_id
)
WHERE supplier_id IN (SELECT id FROM suppliers_to_delete);

-- 8. Atualizar referências no log de atividades
UPDATE activity_log 
SET supplier_id = (
  SELECT stk.id 
  FROM suppliers_to_keep stk
  JOIN suppliers_to_delete std ON std.email = stk.email
  WHERE std.id = activity_log.supplier_id
)
WHERE supplier_id IN (SELECT id FROM suppliers_to_delete);

-- 9. Remover fornecedores duplicados
DELETE FROM suppliers 
WHERE id IN (SELECT id FROM suppliers_to_delete);