-- Limpar dados de teste em ordem correta (respeitar foreign keys)
DELETE FROM activity_log;
DELETE FROM email_logs;
DELETE FROM supplier_magic_codes;
DELETE FROM quotations;
DELETE FROM supplier_responses;
DELETE FROM assistance_photos;
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