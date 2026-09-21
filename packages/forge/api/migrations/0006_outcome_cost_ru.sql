-- Fix RU label for outcome.cost (was incomplete "Успех ценой").
UPDATE translation
SET value = 'Успех с последствиями'
WHERE entity_kind = 'outcome'
	AND locale = 'ru'
	AND field = 'label'
	AND entity_id = (SELECT id FROM vocab WHERE kind = 'outcome' AND slug = 'cost');
