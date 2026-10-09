-- Luck save is a real proficiency track (d20 + Luck), distinct from class 2d10 saves.
-- Foundry already models system.saves.luck; seed closed vocab so Forge/lang export include it.

PRAGMA foreign_keys = ON;

INSERT INTO vocab (kind, slug, label, abbreviation, sort_order)
SELECT 'save', 'luck', 'Luck', '', 4
WHERE NOT EXISTS (
	SELECT 1 FROM vocab WHERE kind = 'save' AND slug = 'luck'
);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'save', v.id, 'ru', 'label', 'Удача'
FROM vocab v
WHERE v.kind = 'save' AND v.slug = 'luck'
	AND NOT EXISTS (
		SELECT 1 FROM translation t
		WHERE t.entity_kind = 'save' AND t.entity_id = v.id
			AND t.locale = 'ru' AND t.field = 'label'
	);
