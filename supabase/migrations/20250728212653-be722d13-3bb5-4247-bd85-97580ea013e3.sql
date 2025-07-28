-- Script para limpar fornecedores duplicados
-- Manter o fornecedor mais recente de cada email e atualizar referências

-- Primeiro, identificamos os IDs dos fornecedores mais antigos a serem removidos
WITH duplicates AS (
  SELECT 
    email, 
    id,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM suppliers 
  WHERE email IS NOT NULL AND email != ''
),
to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
),
to_keep AS (
  SELECT 
    email,
    id as keep_id,
    (SELECT id FROM duplicates d2 WHERE d2.email = duplicates.email AND d2.rn = 1) as keep_id_final
  FROM duplicates 
  WHERE rn = 1
)

-- Atualizar referências nas assistências para usar o fornecedor mais recente
UPDATE assistances 
SET assigned_supplier_id = (
  SELECT tk.keep_id_final 
  FROM to_keep tk 
  JOIN suppliers s ON s.id = tk.keep_id_final
  WHERE s.email = (
    SELECT email FROM suppliers WHERE id = assistances.assigned_supplier_id
  )
)
WHERE assigned_supplier_id IN (SELECT id FROM to_delete);

-- Atualizar referências nas respostas de fornecedores
UPDATE supplier_responses 
SET supplier_id = (
  SELECT tk.keep_id_final 
  FROM to_keep tk 
  JOIN suppliers s ON s.id = tk.keep_id_final
  WHERE s.email = (
    SELECT email FROM suppliers WHERE id = supplier_responses.supplier_id
  )
)
WHERE supplier_id IN (SELECT id FROM to_delete);

-- Atualizar referências nos códigos mágicos
UPDATE supplier_magic_codes 
SET supplier_id = (
  SELECT tk.keep_id_final 
  FROM to_keep tk 
  JOIN suppliers s ON s.id = tk.keep_id_final
  WHERE s.email = (
    SELECT email FROM suppliers WHERE id = supplier_magic_codes.supplier_id
  )
)
WHERE supplier_id IN (SELECT id FROM to_delete);

-- Atualizar referências nos orçamentos
UPDATE quotations 
SET supplier_id = (
  SELECT tk.keep_id_final 
  FROM to_keep tk 
  JOIN suppliers s ON s.id = tk.keep_id_final
  WHERE s.email = (
    SELECT email FROM suppliers WHERE id = quotations.supplier_id
  )
)
WHERE supplier_id IN (SELECT id FROM to_delete);

-- Atualizar referências no progresso das assistências
UPDATE assistance_progress 
SET supplier_id = (
  SELECT tk.keep_id_final 
  FROM to_keep tk 
  JOIN suppliers s ON s.id = tk.keep_id_final
  WHERE s.email = (
    SELECT email FROM suppliers WHERE id = assistance_progress.supplier_id
  )
)
WHERE supplier_id IN (SELECT id FROM to_delete);

-- Atualizar referências no log de atividades
UPDATE activity_log 
SET supplier_id = (
  SELECT tk.keep_id_final 
  FROM to_keep tk 
  JOIN suppliers s ON s.id = tk.keep_id_final
  WHERE s.email = (
    SELECT email FROM suppliers WHERE id = activity_log.supplier_id
  )
)
WHERE supplier_id IN (SELECT id FROM to_delete);

-- Finalmente, remover os fornecedores duplicados
DELETE FROM suppliers 
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
    FROM suppliers 
    WHERE email IS NOT NULL AND email != ''
  ) duplicates 
  WHERE rn > 1
);