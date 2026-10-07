-- Origins pipeline: region, culture (race), background, talent, and join tables.
-- Background lists are scoped by (region, culture). Slugs are unique per table.

PRAGMA foreign_keys = ON;

CREATE TABLE talent (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	slug         TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9.-]*'),
	label        TEXT NOT NULL CHECK (length(label) > 0),
	description  TEXT NOT NULL DEFAULT '',
	comment      TEXT NOT NULL DEFAULT '',
	category     TEXT NOT NULL DEFAULT 'general'
		CHECK (category IN ('class', 'culture', 'skills', 'combat', 'general', 'other')),
	feature_key  TEXT NOT NULL DEFAULT '',
	grants_json  TEXT NOT NULL DEFAULT '{"skills":[],"specializations":[],"abilities":[]}',
	sort_order   INTEGER NOT NULL DEFAULT 0,
	foundry_id   TEXT NOT NULL UNIQUE
		CHECK (length(foundry_id) = 16 AND foundry_id NOT GLOB '*[^A-Za-z0-9]*')
);

CREATE TABLE race (
	id              INTEGER PRIMARY KEY AUTOINCREMENT,
	slug            TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9.-]*'),
	label           TEXT NOT NULL CHECK (length(label) > 0),
	description     TEXT NOT NULL DEFAULT '',
	comment         TEXT NOT NULL DEFAULT '',
	parent_race_id  INTEGER REFERENCES race (id),
	talent_id       INTEGER REFERENCES talent (id),
	sort_order      INTEGER NOT NULL DEFAULT 0,
	foundry_id      TEXT NOT NULL UNIQUE
		CHECK (length(foundry_id) = 16 AND foundry_id NOT GLOB '*[^A-Za-z0-9]*')
);

CREATE TABLE region (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	slug        TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9.-]*'),
	label       TEXT NOT NULL CHECK (length(label) > 0),
	description TEXT NOT NULL DEFAULT '',
	comment     TEXT NOT NULL DEFAULT '',
	sort_order  INTEGER NOT NULL DEFAULT 0,
	foundry_id  TEXT NOT NULL UNIQUE
		CHECK (length(foundry_id) = 16 AND foundry_id NOT GLOB '*[^A-Za-z0-9]*')
);

CREATE TABLE region_culture (
	region_id INTEGER NOT NULL REFERENCES region (id) ON DELETE CASCADE,
	race_id   INTEGER NOT NULL REFERENCES race (id) ON DELETE CASCADE,
	weight    INTEGER NOT NULL CHECK (weight > 0),
	PRIMARY KEY (region_id, race_id)
);

CREATE TABLE background (
	id                      INTEGER PRIMARY KEY AUTOINCREMENT,
	slug                    TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9.-]*'),
	label                   TEXT NOT NULL CHECK (length(label) > 0),
	description             TEXT NOT NULL DEFAULT '',
	comment                 TEXT NOT NULL DEFAULT '',
	free_skill_id           INTEGER NOT NULL REFERENCES skill (id),
	free_specialization_id  INTEGER REFERENCES specialization (id),
	sort_order              INTEGER NOT NULL DEFAULT 0,
	foundry_id              TEXT NOT NULL UNIQUE
		CHECK (length(foundry_id) = 16 AND foundry_id NOT GLOB '*[^A-Za-z0-9]*')
);

CREATE TABLE background_growth (
	background_id      INTEGER NOT NULL REFERENCES background (id) ON DELETE CASCADE,
	roll_index         INTEGER NOT NULL CHECK (roll_index BETWEEN 1 AND 8),
	skill_id           INTEGER NOT NULL REFERENCES skill (id),
	specialization_id  INTEGER REFERENCES specialization (id),
	PRIMARY KEY (background_id, roll_index)
);

CREATE TABLE region_culture_background (
	region_id     INTEGER NOT NULL,
	race_id       INTEGER NOT NULL,
	background_id INTEGER NOT NULL REFERENCES background (id) ON DELETE CASCADE,
	sort_order    INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (region_id, race_id, background_id),
	FOREIGN KEY (region_id, race_id) REFERENCES region_culture (region_id, race_id) ON DELETE CASCADE
);

CREATE TABLE race_class (
	race_id           INTEGER NOT NULL REFERENCES race (id) ON DELETE CASCADE,
	class_id          INTEGER NOT NULL REFERENCES class (id) ON DELETE CASCADE,
	is_prefilled_slot INTEGER NOT NULL DEFAULT 0 CHECK (is_prefilled_slot IN (0, 1)),
	PRIMARY KEY (race_id, class_id)
);

-- Class origin fields for Foundry export (Effort deferred).
ALTER TABLE class ADD COLUMN talent_id INTEGER REFERENCES talent (id);
ALTER TABLE class ADD COLUMN hit_die_priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE class ADD COLUMN talent_picks_warrior INTEGER NOT NULL DEFAULT 0;
ALTER TABLE class ADD COLUMN talent_picks_expert INTEGER NOT NULL DEFAULT 0;
ALTER TABLE class ADD COLUMN talent_picks_any INTEGER NOT NULL DEFAULT 0;
ALTER TABLE class ADD COLUMN save_primary TEXT NOT NULL DEFAULT 'reflex';
ALTER TABLE class ADD COLUMN save_primary_priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE class ADD COLUMN save_secondary TEXT NOT NULL DEFAULT 'fortitude';
ALTER TABLE class ADD COLUMN save_secondary_priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE class ADD COLUMN arts_skill_key TEXT NOT NULL DEFAULT '';
ALTER TABLE class ADD COLUMN class_talent_keys TEXT NOT NULL DEFAULT '[]';

-- Translation parent checks for new entity kinds.
DROP TRIGGER IF EXISTS translation_insert_entity_exists;
DROP TRIGGER IF EXISTS translation_update_entity_exists;

CREATE TRIGGER translation_insert_entity_exists
BEFORE INSERT ON translation
BEGIN
	SELECT CASE
		WHEN NEW.entity_kind = 'attribute'
			AND NOT EXISTS (SELECT 1 FROM attribute WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: attribute not found')
		WHEN NEW.entity_kind = 'skill'
			AND NOT EXISTS (SELECT 1 FROM skill WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: skill not found')
		WHEN NEW.entity_kind = 'specialization'
			AND NOT EXISTS (SELECT 1 FROM specialization WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: specialization not found')
		WHEN NEW.entity_kind = 'class'
			AND NOT EXISTS (SELECT 1 FROM class WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: class not found')
		WHEN NEW.entity_kind = 'race'
			AND NOT EXISTS (SELECT 1 FROM race WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: race not found')
		WHEN NEW.entity_kind = 'region'
			AND NOT EXISTS (SELECT 1 FROM region WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: region not found')
		WHEN NEW.entity_kind = 'background'
			AND NOT EXISTS (SELECT 1 FROM background WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: background not found')
		WHEN NEW.entity_kind = 'talent'
			AND NOT EXISTS (SELECT 1 FROM talent WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: talent not found')
		WHEN NEW.entity_kind IN (
				'proficiency', 'outcome', 'save', 'difficulty', 'derived',
				'condition', 'injury_severity', 'injury_location', 'injury_weapon'
			)
			AND NOT EXISTS (
				SELECT 1 FROM vocab WHERE id = NEW.entity_id AND kind = NEW.entity_kind
			)
			THEN RAISE(ABORT, 'translation.entity_id: vocab not found')
	END;
END;

CREATE TRIGGER translation_update_entity_exists
BEFORE UPDATE OF entity_kind, entity_id ON translation
BEGIN
	SELECT CASE
		WHEN NEW.entity_kind = 'attribute'
			AND NOT EXISTS (SELECT 1 FROM attribute WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: attribute not found')
		WHEN NEW.entity_kind = 'skill'
			AND NOT EXISTS (SELECT 1 FROM skill WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: skill not found')
		WHEN NEW.entity_kind = 'specialization'
			AND NOT EXISTS (SELECT 1 FROM specialization WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: specialization not found')
		WHEN NEW.entity_kind = 'class'
			AND NOT EXISTS (SELECT 1 FROM class WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: class not found')
		WHEN NEW.entity_kind = 'race'
			AND NOT EXISTS (SELECT 1 FROM race WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: race not found')
		WHEN NEW.entity_kind = 'region'
			AND NOT EXISTS (SELECT 1 FROM region WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: region not found')
		WHEN NEW.entity_kind = 'background'
			AND NOT EXISTS (SELECT 1 FROM background WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: background not found')
		WHEN NEW.entity_kind = 'talent'
			AND NOT EXISTS (SELECT 1 FROM talent WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: talent not found')
		WHEN NEW.entity_kind IN (
				'proficiency', 'outcome', 'save', 'difficulty', 'derived',
				'condition', 'injury_severity', 'injury_location', 'injury_weapon'
			)
			AND NOT EXISTS (
				SELECT 1 FROM vocab WHERE id = NEW.entity_id AND kind = NEW.entity_kind
			)
			THEN RAISE(ABORT, 'translation.entity_id: vocab not found')
	END;
END;

CREATE TRIGGER race_delete_translations
AFTER DELETE ON race
BEGIN
	DELETE FROM translation WHERE entity_kind = 'race' AND entity_id = OLD.id;
END;

CREATE TRIGGER region_delete_translations
AFTER DELETE ON region
BEGIN
	DELETE FROM translation WHERE entity_kind = 'region' AND entity_id = OLD.id;
END;

CREATE TRIGGER background_delete_translations
AFTER DELETE ON background
BEGIN
	DELETE FROM translation WHERE entity_kind = 'background' AND entity_id = OLD.id;
END;

CREATE TRIGGER talent_delete_translations
AFTER DELETE ON talent
BEGIN
	DELETE FROM translation WHERE entity_kind = 'talent' AND entity_id = OLD.id;
END;
