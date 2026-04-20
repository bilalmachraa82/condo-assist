-- Auto-resolução: assume formato m/d/y (confirmado via análise do backup pré-correcção)
-- Backup v2 antes de aplicar
CREATE TABLE IF NOT EXISTS public._backup_dates_20260420_v2 AS 
SELECT id, content, updated_at, now() AS backed_up_at 
FROM public.knowledge_articles 
WHERE id IN (
  '4f68ef71-5148-4538-8f0a-89e0202277c8','41eafee5-ea64-4edb-a080-c2e4ccfb8ad3','dbb902b7-5edc-4667-905b-5bb7cc6cbcbe',
  'cf180cf8-b88f-4d7e-9438-e691326f385a','a25a8223-24a6-44c7-b2d4-cff8c123c5a1','1074a251-da7f-4143-99a4-2044203b1a67',
  '60af42ee-e595-4040-a6d8-9545280c1b6e','6abacec6-0950-49fe-934d-48abe8f4f6d6','9416469c-173a-4b8f-8433-b3ad13830149',
  'f5e968f9-f4bc-4c62-bc06-1a2e102d9ed8','abb0a942-2c94-4f3f-9cd3-3748acdf1886','864b71d6-6075-41a2-8580-2928c96c0e5c',
  'e5bbfb1e-e64f-4769-9d73-0199b85027a2','78784020-e198-4c80-8a01-b2cdcb51f01a','416d4f07-0ced-439b-9422-dbda55a5f6a1',
  '2423016d-1d84-4c73-a897-b04b9073e94b','0a180d6a-bbbb-4d7f-a5af-6fa016b58f04','7b1f268c-0bf7-4d8b-a093-85320265813a',
  'e2e1a746-a3a4-4041-ba95-402db10eba39','bd23a119-c35f-46dd-b12b-8e24d70303cb','42ec45e2-2a41-4480-8ea0-9bc91302d9fa',
  '10a4a2c3-b26b-4e9b-916b-0343f8a70248','a3283450-f15e-487a-bcbf-fa9fd1ce279e','233a9cf3-2ed6-4219-8f34-7e8235bfcc08',
  '13a4a4a2-f85b-4a44-9be8-b26856b48af4','1ce30bd0-cf5b-4c5b-b6d3-faf2acf8d78e','10f16193-912d-4e3f-a80a-6301c9ce6116',
  '9c6df60b-19da-4c6c-b8d6-b4bf4875b8e8','97769794-e089-4b7e-adbe-3da8ff3a86a1','93f31a67-e8de-4511-b5a6-d07b43335624',
  'be365776-7b4c-47ef-ad06-340347fa0487','73bd2e3a-9572-4ef4-9b47-aa9ab00f6573','2240ddc9-b7c4-4f90-be85-403530b4c78c',
  '63782947-c06f-427d-9a78-ba8c48049c9d','a5c4112d-2556-4176-a7c0-710402dc4634','f57e9d16-3939-41f1-9817-ee1bd48f6301',
  '7197f450-d93f-46ed-bfff-b1461fb4dcc9','30308ee5-9995-450f-bafc-31b882642d54','8e1a2c17-0839-4620-af36-9f3f1ec64b15',
  '2c3acab0-18b7-44ee-a80d-4598561fb0cf','94a5974f-f062-434b-a4ec-d9c6ff389db6','9441d46e-7e9b-4257-909d-47f2f51e9b37',
  '171aa281-cf41-4b1b-b6b5-b5de2d62f002','218ef315-11d1-4dfe-9bac-a40d98fb528b','52077f70-7474-498b-9dcc-6f6e5f5083a8',
  '8463d015-2197-4029-9e81-a1ba7569ffcf','30de81bb-c98d-4e2e-b4c6-856611f92e02','da7c4bc2-e479-48f4-97ab-1bba0f66698d',
  '2948d86e-b91a-40f0-9bb6-66099bb0339b','78274a3c-bcbf-4c46-8af8-54af5692cbc7','e09f973f-0ecd-4431-9df9-bd81125997f2',
  '128c2616-cdba-4fa5-ad16-55706fa325c3','aa400dcb-91e8-4e34-a956-f83e2cf45358','271d64f5-8f11-49d3-988e-930e5162fd6e',
  'ef86f657-fa58-4165-a400-c68c0b500cc1','a9573122-8a51-4b6e-98be-c9427d2486f2','4fcb8943-3654-4212-b101-aec382f91d34',
  '5606957b-a638-4895-a6e2-f244241e53d5','bc1175be-36dd-4e2a-adc3-23ff85729129','86704b7a-db60-4bc5-a354-eb4dda446837',
  '49c9ed3f-e294-4560-a1fd-e071256d3cee','79425e78-59c5-4f4d-a393-d1333b19d53c','1eedf792-8423-4fde-8a67-e02a8a906e81',
  'c22d4754-1294-42f9-abfe-f8624d078e9d','a5158869-6314-4a5a-afe8-8ccfeeae7abc','ab85410d-9ac1-4cd0-a1cb-8153e2b62693',
  '3b61f6f4-baa1-44d7-be39-e9730c26c2bb','4646688d-8d8b-4627-9aba-30e1abb82bbd','f8b6b3b9-c485-4143-ae20-d5f0df22474e',
  'b609bf32-739a-4537-9301-e7422f2d1e8a','2e1c8bee-0248-40a3-b90b-22b2a7555496','b0e4cf0e-2b3d-4a89-bfb3-a419be0ffd43',
  '59ac0165-bb28-486d-ab57-989617cbc2ed','dbddb809-d35c-4cb3-bfcc-e171ac35d62e','9362ccc8-f486-402a-a8b8-c605eecde550',
  'fa320ab8-36bb-435c-b6e0-996bbb96da81','6528960d-249e-40e6-8c57-75b1268659aa','abe5c472-4ca1-4d2d-bc35-3c1199c0791b',
  '2a52bab7-9f40-411b-ad5b-f03bc65738e7','8ed20a86-806e-4a58-b585-96352cfe3a80','c80760ff-30b4-4b88-8d98-5a3954d070ce',
  '4e5277ef-2320-465a-8125-0339cedcb295','410caea1-41d8-48d9-805e-b868bbcb3b54','3c5cb4cb-93d1-41c1-bb3b-ac87529f5eb7',
  'aa797fb5-3abe-4e7b-99cd-683f9d300191','aa5c8f00-926c-4825-8061-49581cfe1fba','592e1349-4fd9-40f0-bfd6-01355970901a',
  'fd90a829-32b1-4621-99ec-5a0524d04614','e5b80576-6ff9-4f5c-960f-c007f1af996f','a1235d6f-4cc2-43e5-b596-d3bd04a22ba8',
  '73d56e1e-106c-475b-a069-8288648c6318','7586404c-276e-4d34-acac-4297e9c5f881','682527cb-0822-4365-985c-c627a0f81d97',
  '0c39c1d3-9a75-4687-97db-c2fdc6295ea0','94fec232-10f0-433f-b0fd-d263223724d3','adeebd7a-9868-483b-be7a-3c00f443711b',
  'cbd1bb33-34e0-4c59-ad8c-8f5f3753789c','0ac1e29b-2778-44ba-b5ee-79f23dcc3a7b','5b7fc878-5c80-42a5-8706-bf8fa1c24272',
  '9084a064-b9b7-4c60-a91c-ae34db85e54c','e5530132-807c-42d0-91e4-4da34879a129','ddd2bbf7-28f7-44e9-8341-abc043a8e94e'
);
ALTER TABLE public._backup_dates_20260420_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Only admins can manage v2 backup" ON public._backup_dates_20260420_v2;
CREATE POLICY "Only admins can manage v2 backup" ON public._backup_dates_20260420_v2 FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Função auxiliar de uma utilização: aplica swap dia<->mês a uma data ambígua específica num artigo
-- (assume formato m/d/y vindo do Excel EN-US, confirmado pela análise do backup)

UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m12/1/12\M', '01/12/2012', 'g'), updated_at = now() WHERE id = '4f68ef71-5148-4538-8f0a-89e0202277c8';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/16\M', '01/01/2016', 'g'), updated_at = now() WHERE id = '41eafee5-ea64-4edb-a080-c2e4ccfb8ad3';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/2/23\M', '02/05/2023', 'g'), updated_at = now() WHERE id = 'dbb902b7-5edc-4667-905b-5bb7cc6cbcbe';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/27\M', '01/04/2027', 'g'), updated_at = now() WHERE id = 'cf180cf8-b88f-4d7e-9438-e691326f385a';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/7/26\M', '07/05/2026', 'g'), updated_at = now() WHERE id = 'a25a8223-24a6-44c7-b2d4-cff8c123c5a1';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m7/1/24\M', '01/07/2024', 'g'), updated_at = now() WHERE id = '1074a251-da7f-4143-99a4-2044203b1a67';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m8/1/26\M', '01/08/2026', 'g'), updated_at = now() WHERE id = '60af42ee-e595-4040-a6d8-9545280c1b6e';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m11/1/26\M', '01/11/2026', 'g'), updated_at = now() WHERE id = '6abacec6-0950-49fe-934d-48abe8f4f6d6';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m10/1/09\M', '01/10/2009', 'g'), updated_at = now() WHERE id = '9416469c-173a-4b8f-8433-b3ad13830149';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m12/1/26\M', '01/12/2026', 'g'), updated_at = now() WHERE id = 'f5e968f9-f4bc-4c62-bc06-1a2e102d9ed8';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m11/6/26\M', '06/11/2026', 'g'), updated_at = now() WHERE id = 'abb0a942-2c94-4f3f-9cd3-3748acdf1886';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/1/26\M', '01/05/2026', 'g'), updated_at = now() WHERE id = '864b71d6-6075-41a2-8580-2928c96c0e5c';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/8/25\M', '08/05/2025', 'g'), updated_at = now() WHERE id = 'e5bbfb1e-e64f-4769-9d73-0199b85027a2';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m8/10/26\M', '10/08/2026', 'g'), updated_at = now() WHERE id = '78784020-e198-4c80-8a01-b2cdcb51f01a';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m2/3/14\M', '03/02/2014', 'g'), updated_at = now() WHERE id = '416d4f07-0ced-439b-9422-dbda55a5f6a1';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/27\M', '01/04/2027', 'g'), updated_at = now() WHERE id = '2423016d-1d84-4c73-a897-b04b9073e94b';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/8/25\M', '08/05/2025', 'g'), updated_at = now() WHERE id = '0a180d6a-bbbb-4d7f-a5af-6fa016b58f04';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/5/07\M', '05/04/2007', 'g'), updated_at = now() WHERE id = '7b1f268c-0bf7-4d8b-a093-85320265813a';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/27\M', '01/04/2027', 'g'), updated_at = now() WHERE id = 'e2e1a746-a3a4-4041-ba95-402db10eba39';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m2/10/27\M', '10/02/2027', 'g'), updated_at = now() WHERE id = 'bd23a119-c35f-46dd-b12b-8e24d70303cb';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/26\M', '01/04/2026', 'g'), updated_at = now() WHERE id = '42ec45e2-2a41-4480-8ea0-9bc91302d9fa';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/8/25\M', '08/05/2025', 'g'), updated_at = now() WHERE id = '10a4a2c3-b26b-4e9b-916b-0343f8a70248';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m7/1/12\M', '01/07/2012', 'g'), updated_at = now() WHERE id = 'a3283450-f15e-487a-bcbf-fa9fd1ce279e';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m3/1/13\M', '01/03/2013', 'g'), updated_at = now() WHERE id = '233a9cf3-2ed6-4219-8f34-7e8235bfcc08';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/2/12\M', '02/05/2012', 'g'), updated_at = now() WHERE id = '13a4a4a2-f85b-4a44-9be8-b26856b48af4';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m9/1/26\M', '01/09/2026', 'g'), updated_at = now() WHERE id = '1ce30bd0-cf5b-4c5b-b6d3-faf2acf8d78e';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/2/12\M', '02/05/2012', 'g'), updated_at = now() WHERE id = '10f16193-912d-4e3f-a80a-6301c9ce6116';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m7/1/23\M', '01/07/2023', 'g'), updated_at = now() WHERE id = '9c6df60b-19da-4c6c-b8d6-b4bf4875b8e8';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m10/1/26\M', '01/10/2026', 'g'), updated_at = now() WHERE id = '97769794-e089-4b7e-adbe-3da8ff3a86a1';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/8/25\M', '08/05/2025', 'g'), updated_at = now() WHERE id = '93f31a67-e8de-4511-b5a6-d07b43335624';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/09\M', '01/04/2009', 'g'), updated_at = now() WHERE id = 'be365776-7b4c-47ef-ad06-340347fa0487';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/09\M', '01/04/2009', 'g'), updated_at = now() WHERE id = '73bd2e3a-9572-4ef4-9b47-aa9ab00f6573';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m7/12/24\M', '12/07/2024', 'g'), updated_at = now() WHERE id = '2240ddc9-b7c4-4f90-be85-403530b4c78c';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/27\M', '01/04/2027', 'g'), updated_at = now() WHERE id = '63782947-c06f-427d-9a78-ba8c48049c9d';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/11\M', '01/01/2011', 'g'), updated_at = now() WHERE id = 'a5c4112d-2556-4176-a7c0-710402dc4634';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/26\M', '01/06/2026', 'g'), updated_at = now() WHERE id = 'f57e9d16-3939-41f1-9817-ee1bd48f6301';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m9/1/25\M', '01/09/2025', 'g'), updated_at = now() WHERE id = '7197f450-d93f-46ed-bfff-b1461fb4dcc9';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m3/3/15\M', '03/03/2015', 'g'), updated_at = now() WHERE id = '30308ee5-9995-450f-bafc-31b882642d54';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/26\M', '01/06/2026', 'g'), updated_at = now() WHERE id = '8e1a2c17-0839-4620-af36-9f3f1ec64b15';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/8/25\M', '08/05/2025', 'g'), updated_at = now() WHERE id = '2c3acab0-18b7-44ee-a80d-4598561fb0cf';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/10\M', '01/01/2010', 'g'), updated_at = now() WHERE id = '94a5974f-f062-434b-a4ec-d9c6ff389db6';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m3/1/23\M', '01/03/2023', 'g'), updated_at = now() WHERE id = '9441d46e-7e9b-4257-909d-47f2f51e9b37';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/14\M', '01/04/2014', 'g'), updated_at = now() WHERE id = '171aa281-cf41-4b1b-b6b5-b5de2d62f002';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m11/6/26\M', '06/11/2026', 'g'), updated_at = now() WHERE id = '218ef315-11d1-4dfe-9bac-a40d98fb528b';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/2/15\M', '02/04/2015', 'g'), updated_at = now() WHERE id = '52077f70-7474-498b-9dcc-6f6e5f5083a8';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m12/1/26\M', '01/12/2026', 'g'), updated_at = now() WHERE id = '8463d015-2197-4029-9e81-a1ba7569ffcf';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m8/1/11\M', '01/08/2011', 'g'), updated_at = now() WHERE id = '30de81bb-c98d-4e2e-b4c6-856611f92e02';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m12/1/26\M', '01/12/2026', 'g'), updated_at = now() WHERE id = 'da7c4bc2-e479-48f4-97ab-1bba0f66698d';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m10/1/13\M', '01/10/2013', 'g'), updated_at = now() WHERE id = '2948d86e-b91a-40f0-9bb6-66099bb0339b';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m11/1/21\M', '01/11/2021', 'g'), updated_at = now() WHERE id = '78274a3c-bcbf-4c46-8af8-54af5692cbc7';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/26\M', '01/06/2026', 'g'), updated_at = now() WHERE id = 'e09f973f-0ecd-4431-9df9-bd81125997f2';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/24\M', '01/04/2024', 'g'), updated_at = now() WHERE id = '128c2616-cdba-4fa5-ad16-55706fa325c3';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/24\M', '01/06/2024', 'g'), updated_at = now() WHERE id = 'aa400dcb-91e8-4e34-a956-f83e2cf45358';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/26\M', '01/06/2026', 'g'), updated_at = now() WHERE id = '271d64f5-8f11-49d3-988e-930e5162fd6e';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/4/93\M', '04/01/1993', 'g'), updated_at = now() WHERE id = 'ef86f657-fa58-4165-a400-c68c0b500cc1';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/1/26\M', '01/05/2026', 'g'), updated_at = now() WHERE id = 'a9573122-8a51-4b6e-98be-c9427d2486f2';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/15\M', '01/01/2015', 'g'), updated_at = now() WHERE id = '4fcb8943-3654-4212-b101-aec382f91d34';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m11/1/24\M', '01/11/2024', 'g'), updated_at = now() WHERE id = '5606957b-a638-4895-a6e2-f244241e53d5';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m7/1/98\M', '01/07/1998', 'g'), updated_at = now() WHERE id = 'bc1175be-36dd-4e2a-adc3-23ff85729129';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/14\M', '01/01/2014', 'g'), updated_at = now() WHERE id = '86704b7a-db60-4bc5-a354-eb4dda446837';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/26\M', '01/04/2026', 'g'), updated_at = now() WHERE id = '49c9ed3f-e294-4560-a1fd-e071256d3cee';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m7/1/25\M', '01/07/2025', 'g'), updated_at = now() WHERE id = '79425e78-59c5-4f4d-a393-d1333b19d53c';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/1/26\M', '01/05/2026', 'g'), updated_at = now() WHERE id = '1eedf792-8423-4fde-8a67-e02a8a906e81';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/15\M', '01/04/2015', 'g'), updated_at = now() WHERE id = 'c22d4754-1294-42f9-abfe-f8624d078e9d';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/26\M', '01/06/2026', 'g'), updated_at = now() WHERE id = 'a5158869-6314-4a5a-afe8-8ccfeeae7abc';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m7/1/24\M', '01/07/2024', 'g'), updated_at = now() WHERE id = 'ab85410d-9ac1-4cd0-a1cb-8153e2b62693';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/00\M', '01/01/2000', 'g'), updated_at = now() WHERE id = '3b61f6f4-baa1-44d7-be39-e9730c26c2bb';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/15\M', '01/06/2015', 'g'), updated_at = now() WHERE id = '4646688d-8d8b-4627-9aba-30e1abb82bbd';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/18\M', '01/06/2018', 'g'), updated_at = now() WHERE id = 'f8b6b3b9-c485-4143-ae20-d5f0df22474e';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m7/1/21\M', '01/07/2021', 'g'), updated_at = now() WHERE id = 'b609bf32-739a-4537-9301-e7422f2d1e8a';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/7/21\M', '07/06/2021', 'g'), updated_at = now() WHERE id = '2e1c8bee-0248-40a3-b90b-22b2a7555496';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/15\M', '01/01/2015', 'g'), updated_at = now() WHERE id = 'b0e4cf0e-2b3d-4a89-bfb3-a419be0ffd43';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/15\M', '01/06/2015', 'g'), updated_at = now() WHERE id = '59ac0165-bb28-486d-ab57-989617cbc2ed';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/13\M', '01/01/2013', 'g'), updated_at = now() WHERE id = 'dbddb809-d35c-4cb3-bfcc-e171ac35d62e';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m12/1/14\M', '01/12/2014', 'g'), updated_at = now() WHERE id = '9362ccc8-f486-402a-a8b8-c605eecde550';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m7/1/12\M', '01/07/2012', 'g'), updated_at = now() WHERE id = 'fa320ab8-36bb-435c-b6e0-996bbb96da81';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/1/26\M', '01/05/2026', 'g'), updated_at = now() WHERE id = '6528960d-249e-40e6-8c57-75b1268659aa';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/07\M', '01/01/2007', 'g'), updated_at = now() WHERE id = 'abe5c472-4ca1-4d2d-bc35-3c1199c0791b';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/84\M', '01/01/1984', 'g'), updated_at = now() WHERE id = '2a52bab7-9f40-411b-ad5b-f03bc65738e7';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/15\M', '01/01/2015', 'g'), updated_at = now() WHERE id = '8ed20a86-806e-4a58-b585-96352cfe3a80';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m10/1/26\M', '01/10/2026', 'g'), updated_at = now() WHERE id = 'c80760ff-30b4-4b88-8d98-5a3954d070ce';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m11/1/18\M', '01/11/2018', 'g'), updated_at = now() WHERE id = '4e5277ef-2320-465a-8125-0339cedcb295';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/26\M', '01/06/2026', 'g'), updated_at = now() WHERE id = '410caea1-41d8-48d9-805e-b868bbcb3b54';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m8/1/26\M', '01/08/2026', 'g'), updated_at = now() WHERE id = '3c5cb4cb-93d1-41c1-bb3b-ac87529f5eb7';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/22\M', '01/06/2022', 'g'), updated_at = now() WHERE id = 'aa797fb5-3abe-4e7b-99cd-683f9d300191';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m2/4/22\M', '04/02/2022', 'g'), updated_at = now() WHERE id = 'aa5c8f00-926c-4825-8061-49581cfe1fba';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m7/1/20\M', '01/07/2020', 'g'), updated_at = now() WHERE id = '592e1349-4fd9-40f0-bfd6-01355970901a';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m8/1/26\M', '01/08/2026', 'g'), updated_at = now() WHERE id = 'fd90a829-32b1-4621-99ec-5a0524d04614';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m2/11/17\M', '11/02/2017', 'g'), updated_at = now() WHERE id = 'e5b80576-6ff9-4f5c-960f-c007f1af996f';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/9/25\M', '09/04/2025', 'g'), updated_at = now() WHERE id = 'a1235d6f-4cc2-43e5-b596-d3bd04a22ba8';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/5/23\M', '05/05/2023', 'g'), updated_at = now() WHERE id = '73d56e1e-106c-475b-a069-8288648c6318';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m4/1/27\M', '01/04/2027', 'g'), updated_at = now() WHERE id = '7586404c-276e-4d34-acac-4297e9c5f881';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m1/1/14\M', '01/01/2014', 'g'), updated_at = now() WHERE id = '682527cb-0822-4365-985c-c627a0f81d97';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/07\M', '01/06/2007', 'g'), updated_at = now() WHERE id = '0c39c1d3-9a75-4687-97db-c2fdc6295ea0';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/26\M', '01/06/2026', 'g'), updated_at = now() WHERE id = '94fec232-10f0-433f-b0fd-d263223724d3';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m3/1/94\M', '01/03/1994', 'g'), updated_at = now() WHERE id = 'adeebd7a-9868-483b-be7a-3c00f443711b';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m11/1/26\M', '01/11/2026', 'g'), updated_at = now() WHERE id = 'cbd1bb33-34e0-4c59-ad8c-8f5f3753789c';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m6/1/25\M', '01/06/2025', 'g'), updated_at = now() WHERE id = '0ac1e29b-2778-44ba-b5ee-79f23dcc3a7b';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m8/1/22\M', '01/08/2022', 'g'), updated_at = now() WHERE id = '5b7fc878-5c80-42a5-8706-bf8fa1c24272';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m5/1/26\M', '01/05/2026', 'g'), updated_at = now() WHERE id = '9084a064-b9b7-4c60-a91c-ae34db85e54c';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m3/1/24\M', '01/03/2024', 'g'), updated_at = now() WHERE id = 'e5530132-807c-42d0-91e4-4da34879a129';
UPDATE public.knowledge_articles SET content = regexp_replace(content, '\m3/1/27\M', '01/03/2027', 'g'), updated_at = now() WHERE id = 'ddd2bbf7-28f7-44e9-8341-abc043a8e94e';