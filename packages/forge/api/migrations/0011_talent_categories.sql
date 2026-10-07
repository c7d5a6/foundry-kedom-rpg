-- Talent categories: class | culture | skills | combat | general | other.
-- Rebuild talent (SQLite cannot ALTER CHECK). Drop triggers that reference
-- talent, clear FKs, swap the table, restore FKs and triggers.

DROP TRIGGER IF EXISTS translation_insert_entity_exists;
DROP TRIGGER IF EXISTS translation_update_entity_exists;
DROP TRIGGER IF EXISTS talent_delete_translations;

CREATE TABLE talent_new (
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

INSERT INTO talent_new (
	id, slug, label, description, comment, category, feature_key, grants_json, sort_order, foundry_id
)
SELECT
	id, slug, label, description, comment,
	CASE category
		WHEN 'warrior' THEN 'combat'
		WHEN 'expert' THEN 'skills'
		WHEN 'any' THEN 'general'
		WHEN 'class' THEN 'class'
		WHEN 'race' THEN 'culture'
		WHEN 'culture' THEN 'culture'
		WHEN 'skills' THEN 'skills'
		WHEN 'combat' THEN 'combat'
		WHEN 'general' THEN 'general'
		WHEN 'other' THEN 'other'
		ELSE 'general'
	END,
	feature_key, grants_json, sort_order, foundry_id
FROM talent;

CREATE TEMP TABLE _talent_fk_race AS
SELECT id AS race_id, talent_id FROM race WHERE talent_id IS NOT NULL;

CREATE TEMP TABLE _talent_fk_class AS
SELECT id AS class_id, talent_id FROM class WHERE talent_id IS NOT NULL;

UPDATE race SET talent_id = NULL WHERE talent_id IS NOT NULL;
UPDATE class SET talent_id = NULL WHERE talent_id IS NOT NULL;

DROP TABLE talent;
ALTER TABLE talent_new RENAME TO talent;

UPDATE race
SET talent_id = (
	SELECT talent_id FROM _talent_fk_race WHERE _talent_fk_race.race_id = race.id
)
WHERE id IN (SELECT race_id FROM _talent_fk_race);

UPDATE class
SET talent_id = (
	SELECT talent_id FROM _talent_fk_class WHERE _talent_fk_class.class_id = class.id
)
WHERE id IN (SELECT class_id FROM _talent_fk_class);

DROP TABLE _talent_fk_race;
DROP TABLE _talent_fk_class;

CREATE TRIGGER talent_delete_translations
AFTER DELETE ON talent
BEGIN
	DELETE FROM translation WHERE entity_kind = 'talent' AND entity_id = OLD.id;
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
