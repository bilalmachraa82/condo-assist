-- Limpar dados de teste e inserir dados reais da Luvimg
DELETE FROM assistances;
DELETE FROM suppliers WHERE email NOT LIKE '%@luvimg.com' AND email NOT IN (
  'info.tkept@tkelevator.com',
  'ana.ferreira.santos@srobras.pt',
  'geral@clefta.pt',
  'ascensoeleva.lda@sapo.pt',
  'lojamestredaschaves@gmail.com',
  'geral@ipest.pt',
  'desinfestlar@sapo.pt'
);
DELETE FROM buildings;
DELETE FROM supplier_magic_codes;
DELETE FROM activity_log;
DELETE FROM email_logs;