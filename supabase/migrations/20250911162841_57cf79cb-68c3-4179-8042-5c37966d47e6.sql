-- Delete the specific test quotations created earlier
DELETE FROM quotations WHERE id IN (
  '2764e45a-ac10-490b-bba5-a4c2bac7735b',
  '52bc890e-a5ff-4731-9cc9-efc018ff74d5', 
  '6840a32a-924d-418f-9445-d2574fe05f1c',
  '8e2d8474-c2b5-46fa-b995-6a3626b73dd2',
  '54502fa2-501d-456b-95f5-86006f12d687'
);