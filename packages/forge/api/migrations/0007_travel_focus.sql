-- Travel is Focus-governed; its specializations are a closed list (Exotic deferred).
-- Survive stays parameterized (fixed list + freeform environments).

UPDATE skill
SET attribute_id = (SELECT id FROM attribute WHERE slug = 'foc'),
    specialization_mode = 'fixed'
WHERE slug = 'travel';

UPDATE skill
SET specialization_mode = 'parameterized'
WHERE slug = 'survive';
