-- Fase 1: Remover edifícios obsoletos (que não estão na nova lista)
DELETE FROM buildings WHERE code IN ('055', '168', '169', '170', '171', '172', '173', '174', '175', '176', '177', '178', '179', '180', '181');

-- Fase 2: Atualizar edifícios existentes com NIFs corretos
UPDATE buildings SET nif = '901383325' WHERE code = '003';
UPDATE buildings SET nif = '900532963' WHERE code = '004';
UPDATE buildings SET nif = '901956295' WHERE code = '006';
UPDATE buildings SET nif = '900981024' WHERE code = '008';
UPDATE buildings SET nif = '901124761' WHERE code = '009';
UPDATE buildings SET nif = '901529621' WHERE code = '010';
UPDATE buildings SET nif = '900547634' WHERE code = '017';
UPDATE buildings SET nif = '900570881' WHERE code = '029';
UPDATE buildings SET nif = '901135917' WHERE code = '031';
UPDATE buildings SET nif = '900735554' WHERE code = '035';
UPDATE buildings SET nif = '900496320' WHERE code = '045';
UPDATE buildings SET nif = '901416185' WHERE code = '059';
UPDATE buildings SET nif = '900733349' WHERE code = '064';
UPDATE buildings SET nif = '900769726' WHERE code = '067';
UPDATE buildings SET nif = '901548456' WHERE code = '072';
UPDATE buildings SET nif = '901493562' WHERE code = '074';
UPDATE buildings SET nif = '900810777' WHERE code = '077';
UPDATE buildings SET nif = '901176389' WHERE code = '078';
UPDATE buildings SET nif = '900748192' WHERE code = '082';
UPDATE buildings SET nif = '901627623' WHERE code = '083';
UPDATE buildings SET nif = '901305936' WHERE code = '086';
UPDATE buildings SET nif = '901644218' WHERE code = '089';
UPDATE buildings SET nif = '900956976' WHERE code = '092';
UPDATE buildings SET nif = '901279358' WHERE code = '093';
UPDATE buildings SET nif = '901343617' WHERE code = '098';
UPDATE buildings SET nif = '901762890' WHERE code = '100';
UPDATE buildings SET nif = '901553620' WHERE code = '101';
UPDATE buildings SET nif = '900347333' WHERE code = '108';
UPDATE buildings SET nif = '900569921' WHERE code = '110';
UPDATE buildings SET nif = '901921130' WHERE code = '121';
UPDATE buildings SET nif = '900447893' WHERE code = '122';
UPDATE buildings SET nif = '900406496' WHERE code = '123';
UPDATE buildings SET nif = '900426411' WHERE code = '126';
UPDATE buildings SET nif = '900876980' WHERE code = '128';
UPDATE buildings SET nif = '900607858' WHERE code = '140';
UPDATE buildings SET nif = '900711299' WHERE code = '141';
UPDATE buildings SET nif = '901978752' WHERE code = '142';
UPDATE buildings SET nif = '900198931' WHERE code = '143';
UPDATE buildings SET nif = '900210478' WHERE code = '144';
UPDATE buildings SET nif = '900168137' WHERE code = '145';
UPDATE buildings SET nif = '900405350' WHERE code = '146';
UPDATE buildings SET nif = '900595183' WHERE code = '147';
UPDATE buildings SET nif = '900697741' WHERE code = '148';
UPDATE buildings SET nif = '900452056' WHERE code = '149';
UPDATE buildings SET nif = '900976454' WHERE code = '150';
UPDATE buildings SET nif = '900307536' WHERE code = '151';
UPDATE buildings SET nif = '900493666' WHERE code = '152';
UPDATE buildings SET nif = '900898232' WHERE code = '153';
UPDATE buildings SET nif = '901054526' WHERE code = '154';
UPDATE buildings SET nif = '901140015' WHERE code = '155';
UPDATE buildings SET nif = '900790857' WHERE code = '157';
UPDATE buildings SET nif = '901611417' WHERE code = '158';
UPDATE buildings SET nif = '900990392' WHERE code = '159';
UPDATE buildings SET nif = '901169552' WHERE code = '161';
UPDATE buildings SET nif = '900278552' WHERE code = '162';
UPDATE buildings SET nif = '901172200' WHERE code = '163';
UPDATE buildings SET nif = '900861118' WHERE code = '164';
UPDATE buildings SET nif = '901516287' WHERE code = '165';
UPDATE buildings SET nif = '900996099' WHERE code = '166';

-- Fase 3: Inserir novos edifícios
INSERT INTO buildings (code, name, nif, is_active, created_at, updated_at) VALUES
('011', 'COND. PCTA TENENTE CORONEL SALGUEIRO MAIA, 3', '900942894', true, now(), now()),
('080', 'COND PRACETA PEDRO MANUEL PEREIRA Nº 6', '901022586', true, now(), now()),
('114', 'COND. ALAMEDA FERNANDO NAMORA, Nº 1', '900702486', true, now(), now()),
('120', 'COND. R. LEITE DE VASCONCELOS, 49 A 49B', NULL, true, now(), now()),
('124', 'COND. PCTA SIDÓNIO MURALHA, LTE 39', NULL, true, now(), now()),
('125', 'COND.AV. BARBOSA DU BOCAGE, 25', '901224910', true, now(), now()),
('127', 'COND. R.SÃO TOMÉ E PRINCIPE, Nº41', '901762733', true, now(), now()),
('129', 'COND. ALAMEDA FERNANDO NAMORA, 16', '901526614', true, now(), now()),
('156', 'COND. R. FERNANDO MAURÍCIO, 23', '901591890', true, now(), now()),
('160', 'COND. RUA ALVES REDOL, 8', '901501980', true, now(), now()),
('167', 'COND. AV. DAS DESCOBERTAS, 33', '900489235', true, now(), now());