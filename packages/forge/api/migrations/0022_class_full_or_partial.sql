-- Classes are exclusively full OR partial (XOR), never both.
-- Split dual-flag rows into a full original + sibling `{slug}-partial`.
-- Enforce XOR with triggers (SQLite cannot ALTER an existing CHECK).

-- 1) Insert partial siblings for classes marked both full and partial.
INSERT INTO class (
	slug, label, description, comment,
	is_full, is_partial, hit_die, hit_die_priority,
	talent_picks_warrior, talent_picks_expert, talent_picks_any,
	save_primary, save_primary_priority, save_secondary, save_secondary_priority,
	arts_skill_key, sort_order, foundry_id
)
SELECT
	c.slug || '-partial',
	c.label,
	c.description,
	c.comment,
	0,
	1,
	c.hit_die,
	c.hit_die_priority,
	c.talent_picks_warrior,
	c.talent_picks_expert,
	c.talent_picks_any,
	c.save_primary,
	c.save_primary_priority,
	c.save_secondary,
	c.save_secondary_priority,
	c.arts_skill_key,
	c.sort_order,
	lower(hex(randomblob(8)))
FROM class c
WHERE c.is_full = 1 AND c.is_partial = 1
	AND NOT EXISTS (SELECT 1 FROM class x WHERE x.slug = c.slug || '-partial');

-- 2) Copy class_talent links onto the new partials.
INSERT INTO class_talent (class_id, talent_id, sort_order)
SELECT p.id, ct.talent_id, ct.sort_order
FROM class f
JOIN class p ON p.slug = f.slug || '-partial'
JOIN class_talent ct ON ct.class_id = f.id
WHERE f.is_full = 1 AND f.is_partial = 1
	AND NOT EXISTS (
		SELECT 1 FROM class_talent x
		WHERE x.class_id = p.id AND x.talent_id = ct.talent_id
	);

-- 3) Copy translations onto the new partials.
INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'class', p.id, t.locale, t.field, t.value
FROM class f
JOIN class p ON p.slug = f.slug || '-partial'
JOIN translation t ON t.entity_kind = 'class' AND t.entity_id = f.id
WHERE f.is_full = 1 AND f.is_partial = 1
	AND NOT EXISTS (
		SELECT 1 FROM translation x
		WHERE x.entity_kind = 'class'
			AND x.entity_id = p.id
			AND x.locale = t.locale
			AND x.field = t.field
	);

-- 4) Cultures that allowed the dual class also allow the new partial.
INSERT INTO race_class (race_id, class_id)
SELECT rc.race_id, p.id
FROM class f
JOIN class p ON p.slug = f.slug || '-partial'
JOIN race_class rc ON rc.class_id = f.id
WHERE f.is_full = 1 AND f.is_partial = 1
	AND NOT EXISTS (
		SELECT 1 FROM race_class x
		WHERE x.race_id = rc.race_id AND x.class_id = p.id
	);

-- 5) Dual rows become full-only.
UPDATE class SET is_partial = 0 WHERE is_full = 1 AND is_partial = 1;

-- 6) Enforce XOR on future writes (table CHECK remains OR for historical schema).
DROP TRIGGER IF EXISTS class_full_or_partial_insert;
DROP TRIGGER IF EXISTS class_full_or_partial_update;

CREATE TRIGGER class_full_or_partial_insert
BEFORE INSERT ON class
BEGIN
	SELECT CASE
		WHEN NEW.is_full + NEW.is_partial != 1
			THEN RAISE(ABORT, 'class must be exactly full or partial')
	END;
END;

CREATE TRIGGER class_full_or_partial_update
BEFORE UPDATE OF is_full, is_partial ON class
BEGIN
	SELECT CASE
		WHEN NEW.is_full + NEW.is_partial != 1
			THEN RAISE(ABORT, 'class must be exactly full or partial')
	END;
END;
