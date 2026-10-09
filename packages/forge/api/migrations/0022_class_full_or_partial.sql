-- Classes are exclusively full OR partial (XOR), never both.
-- Split dual-flag rows into a full original + sibling `{slug}-partial`.

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

-- 6) Rebuild class with XOR check (SQLite cannot ALTER CHECK).
CREATE TABLE class_new (
	id                     INTEGER PRIMARY KEY AUTOINCREMENT,
	slug                   TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9-]*'),
	label                  TEXT NOT NULL CHECK (length(label) > 0),
	description            TEXT NOT NULL DEFAULT '',
	is_full                INTEGER NOT NULL DEFAULT 0 CHECK (is_full IN (0, 1)),
	is_partial             INTEGER NOT NULL DEFAULT 0 CHECK (is_partial IN (0, 1)),
	hit_die                TEXT,
	sort_order             INTEGER NOT NULL DEFAULT 0,
	foundry_id             TEXT NOT NULL UNIQUE
		CHECK (length(foundry_id) = 16 AND foundry_id NOT GLOB '*[^A-Za-z0-9]*'),
	comment                TEXT NOT NULL DEFAULT '',
	hit_die_priority       INTEGER NOT NULL DEFAULT 0,
	talent_picks_warrior   INTEGER NOT NULL DEFAULT 0,
	talent_picks_expert    INTEGER NOT NULL DEFAULT 0,
	talent_picks_any       INTEGER NOT NULL DEFAULT 0,
	save_primary           TEXT NOT NULL DEFAULT 'reflex',
	save_primary_priority  INTEGER NOT NULL DEFAULT 0,
	save_secondary         TEXT NOT NULL DEFAULT 'fortitude',
	save_secondary_priority INTEGER NOT NULL DEFAULT 0,
	arts_skill_key         TEXT NOT NULL DEFAULT '',
	CHECK (is_full + is_partial = 1)
);

INSERT INTO class_new (
	id, slug, label, description, is_full, is_partial, hit_die, sort_order, foundry_id,
	comment, hit_die_priority, talent_picks_warrior, talent_picks_expert, talent_picks_any,
	save_primary, save_primary_priority, save_secondary, save_secondary_priority, arts_skill_key
)
SELECT
	id, slug, label, description, is_full, is_partial, hit_die, sort_order, foundry_id,
	comment, hit_die_priority, talent_picks_warrior, talent_picks_expert, talent_picks_any,
	save_primary, save_primary_priority, save_secondary, save_secondary_priority, arts_skill_key
FROM class;

-- Drop dependents that FK to class, then restore.
CREATE TABLE class_talent_bak AS SELECT * FROM class_talent;
CREATE TABLE race_class_bak AS SELECT * FROM race_class;

DROP TABLE class_talent;
DROP TABLE race_class;
DROP TABLE class;
ALTER TABLE class_new RENAME TO class;

CREATE TABLE class_talent (
	class_id   INTEGER NOT NULL REFERENCES class (id) ON DELETE CASCADE,
	talent_id  INTEGER NOT NULL REFERENCES talent (id),
	sort_order INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (class_id, talent_id)
);

INSERT INTO class_talent (class_id, talent_id, sort_order)
SELECT class_id, talent_id, sort_order FROM class_talent_bak;

DROP TABLE class_talent_bak;

CREATE TABLE race_class (
	race_id  INTEGER NOT NULL REFERENCES race (id) ON DELETE CASCADE,
	class_id INTEGER NOT NULL REFERENCES class (id) ON DELETE CASCADE,
	PRIMARY KEY (race_id, class_id)
);

INSERT INTO race_class (race_id, class_id)
SELECT race_id, class_id FROM race_class_bak;

DROP TABLE race_class_bak;
