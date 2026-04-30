DELETE FROM inspection_categories
 WHERE key IN ('avac','para_raios','ite')
   AND NOT EXISTS (
     SELECT 1 FROM building_inspections bi WHERE bi.category_id = inspection_categories.id
   );