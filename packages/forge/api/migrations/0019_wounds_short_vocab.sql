-- Sheet header abbr for wounds (KEDOM.Attributes.woundsShort).

PRAGMA foreign_keys = ON;

INSERT INTO vocab (kind, slug, label, abbreviation, sort_order)
SELECT 'derived', 'woundsShort', 'W', '', 21
WHERE NOT EXISTS (
	SELECT 1 FROM vocab WHERE kind = 'derived' AND slug = 'woundsShort'
);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'derived', v.id, 'ru', 'label', 'Р'
FROM vocab v
WHERE v.kind = 'derived' AND v.slug = 'woundsShort'
	AND NOT EXISTS (
		SELECT 1 FROM translation t
		WHERE t.entity_kind = 'derived' AND t.entity_id = v.id
			AND t.locale = 'ru' AND t.field = 'label'
	);
