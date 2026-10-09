-- Sheet stub label for Defense (KEDOM.Attributes.defense / defenseShort).
-- Distinct from legacy ac / acShort slugs kept for compatibility.

PRAGMA foreign_keys = ON;

INSERT INTO vocab (kind, slug, label, abbreviation, sort_order)
SELECT 'derived', 'defense', 'Defense', 'DEF', 22
WHERE NOT EXISTS (
	SELECT 1 FROM vocab WHERE kind = 'derived' AND slug = 'defense'
);

INSERT INTO vocab (kind, slug, label, abbreviation, sort_order)
SELECT 'derived', 'defenseShort', 'DEF', '', 23
WHERE NOT EXISTS (
	SELECT 1 FROM vocab WHERE kind = 'derived' AND slug = 'defenseShort'
);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'derived', v.id, 'ru', 'label',
	CASE v.slug
		WHEN 'defense' THEN 'Защита'
		WHEN 'defenseShort' THEN 'ЗАЩ'
	END
FROM vocab v
WHERE v.kind = 'derived' AND v.slug IN ('defense', 'defenseShort')
	AND NOT EXISTS (
		SELECT 1 FROM translation t
		WHERE t.entity_kind = 'derived' AND t.entity_id = v.id
			AND t.locale = 'ru' AND t.field = 'label'
	);
