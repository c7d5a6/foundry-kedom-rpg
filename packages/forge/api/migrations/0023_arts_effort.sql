-- Class Effort (skill + two attributes) + art slots by level.
-- Arts catalog table; translation entity_kind 'art'.

ALTER TABLE class RENAME COLUMN arts_skill_key TO effort_skill_key;
ALTER TABLE class ADD COLUMN effort_ability_key_1 TEXT NOT NULL DEFAULT '';
ALTER TABLE class ADD COLUMN effort_ability_key_2 TEXT NOT NULL DEFAULT '';
ALTER TABLE class ADD COLUMN art_slots_json TEXT NOT NULL DEFAULT '[0,0,0,0,0,0,0,0,0,0]';

CREATE TABLE art (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	slug         TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9-]*'),
	label        TEXT NOT NULL CHECK (length(label) > 0),
	description  TEXT NOT NULL DEFAULT '',
	comment      TEXT NOT NULL DEFAULT '',
	class_id     INTEGER NOT NULL REFERENCES class (id) ON DELETE CASCADE,
	commitment   TEXT NOT NULL DEFAULT 'scene'
		CHECK (commitment IN ('scene', 'day', 'concentration', 'free')),
	effects_json TEXT NOT NULL DEFAULT '[]',
	sort_order   INTEGER NOT NULL DEFAULT 0,
	foundry_id   TEXT NOT NULL UNIQUE
		CHECK (length(foundry_id) = 16 AND foundry_id NOT GLOB '*[^A-Za-z0-9]*')
);

-- Expand translation.entity_kind CHECK to include 'art'.
-- Drop every trigger that references translation before DROP TABLE
-- (same pattern as 0004 / 0009 — otherwise SQLite fails with
-- "error in trigger attribute_delete_translations: no such table").
DROP TRIGGER IF EXISTS translation_insert_entity_exists;
DROP TRIGGER IF EXISTS translation_update_entity_exists;
DROP TRIGGER IF EXISTS attribute_delete_translations;
DROP TRIGGER IF EXISTS skill_delete_translations;
DROP TRIGGER IF EXISTS specialization_delete_translations;
DROP TRIGGER IF EXISTS class_delete_translations;
DROP TRIGGER IF EXISTS vocab_delete_translations;
DROP TRIGGER IF EXISTS race_delete_translations;
DROP TRIGGER IF EXISTS region_delete_translations;
DROP TRIGGER IF EXISTS background_delete_translations;
DROP TRIGGER IF EXISTS talent_delete_translations;
DROP TRIGGER IF EXISTS art_delete_translations;

CREATE TABLE translation_new (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	entity_kind TEXT NOT NULL
		CHECK (entity_kind IN (
			'attribute', 'skill', 'specialization', 'class',
			'background', 'region', 'talent', 'art', 'power', 'condition', 'injury', 'race',
			'proficiency', 'outcome', 'save', 'difficulty', 'derived',
			'injury_severity', 'injury_location', 'injury_weapon'
		)),
	entity_id   INTEGER NOT NULL,
	locale      TEXT NOT NULL CHECK (locale != 'en' AND length(locale) > 0),
	field       TEXT NOT NULL CHECK (field IN ('label', 'abbreviation', 'description')),
	value       TEXT NOT NULL CHECK (length(value) > 0),
	UNIQUE (entity_kind, entity_id, locale, field)
);

INSERT INTO translation_new (id, entity_kind, entity_id, locale, field, value)
SELECT id, entity_kind, entity_id, locale, field, value FROM translation;

DROP TABLE translation;
ALTER TABLE translation_new RENAME TO translation;

CREATE TRIGGER attribute_delete_translations
AFTER DELETE ON attribute
BEGIN
	DELETE FROM translation WHERE entity_kind = 'attribute' AND entity_id = OLD.id;
END;

CREATE TRIGGER skill_delete_translations
AFTER DELETE ON skill
BEGIN
	DELETE FROM translation WHERE entity_kind = 'skill' AND entity_id = OLD.id;
END;

CREATE TRIGGER specialization_delete_translations
AFTER DELETE ON specialization
BEGIN
	DELETE FROM translation WHERE entity_kind = 'specialization' AND entity_id = OLD.id;
END;

CREATE TRIGGER class_delete_translations
AFTER DELETE ON class
BEGIN
	DELETE FROM translation WHERE entity_kind = 'class' AND entity_id = OLD.id;
END;

CREATE TRIGGER vocab_delete_translations
AFTER DELETE ON vocab
BEGIN
	DELETE FROM translation WHERE entity_kind = OLD.kind AND entity_id = OLD.id;
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

CREATE TRIGGER art_delete_translations
AFTER DELETE ON art
BEGIN
	DELETE FROM translation WHERE entity_kind = 'art' AND entity_id = OLD.id;
END;

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
		WHEN NEW.entity_kind = 'art'
			AND NOT EXISTS (SELECT 1 FROM art WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: art not found')
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
		WHEN NEW.entity_kind = 'art'
			AND NOT EXISTS (SELECT 1 FROM art WHERE id = NEW.entity_id)
			THEN RAISE(ABORT, 'translation.entity_id: art not found')
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
