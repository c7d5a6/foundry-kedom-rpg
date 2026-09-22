-- Strain triad labels + melee damage (KEDOM.Attributes).
INSERT INTO vocab (kind, slug, label, abbreviation, sort_order) VALUES
	('derived', 'strainLimit', 'Strain Limit', 'SL', 16),
	('derived', 'strainLimitShort', 'SL', '', 17),
	('derived', 'resolve', 'Resolve', 'RSV', 18),
	('derived', 'resolveShort', 'RSV', '', 19),
	('derived', 'meleeDamage', 'Melee Damage', '', 20);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'derived', id, 'ru', 'label',
	CASE slug
		WHEN 'strainLimit' THEN 'Предел напряжения'
		WHEN 'strainLimitShort' THEN 'ПН'
		WHEN 'resolve' THEN 'Решимость'
		WHEN 'resolveShort' THEN 'РШ'
		WHEN 'meleeDamage' THEN 'Урон в ближнем бою'
	END
FROM vocab WHERE kind = 'derived' AND slug IN (
	'strainLimit', 'strainLimitShort', 'resolve', 'resolveShort', 'meleeDamage'
);
