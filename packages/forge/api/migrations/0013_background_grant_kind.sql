-- Background free/growth grants may be concrete skills or wildcards (anyCombat / anySkill).
-- Rebuild background + background_growth (nullable skill_id). Same pattern as 0011:
-- drop translation triggers that reference background, clear dependents, swap, restore.

DROP TRIGGER IF EXISTS translation_insert_entity_exists;
DROP TRIGGER IF EXISTS translation_update_entity_exists;
DROP TRIGGER IF EXISTS background_delete_translations;

CREATE TABLE background_new (
	id                      INTEGER PRIMARY KEY AUTOINCREMENT,
	slug                    TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9.-]*'),
	label                   TEXT NOT NULL CHECK (length(label) > 0),
	description             TEXT NOT NULL DEFAULT '',
	comment                 TEXT NOT NULL DEFAULT '',
	free_grant_kind         TEXT NOT NULL DEFAULT 'skill'
		CHECK (free_grant_kind IN ('skill', 'anyCombat', 'anySkill')),
	free_skill_id           INTEGER REFERENCES skill (id),
	free_specialization_id  INTEGER REFERENCES specialization (id),
	free_specialization_label TEXT NOT NULL DEFAULT '',
	sort_order              INTEGER NOT NULL DEFAULT 0,
	foundry_id              TEXT NOT NULL UNIQUE
		CHECK (length(foundry_id) = 16 AND foundry_id NOT GLOB '*[^A-Za-z0-9]*'),
	CHECK (
		(free_grant_kind = 'skill' AND free_skill_id IS NOT NULL)
		OR (free_grant_kind != 'skill' AND free_skill_id IS NULL
			AND free_specialization_id IS NULL
			AND free_specialization_label = '')
	)
);

INSERT INTO background_new (
	id, slug, label, description, comment,
	free_grant_kind, free_skill_id, free_specialization_id, free_specialization_label,
	sort_order, foundry_id
)
SELECT
	id, slug, label, description, comment,
	'skill', free_skill_id, free_specialization_id, free_specialization_label,
	sort_order, foundry_id
FROM background;

CREATE TEMP TABLE _background_growth_bak AS
SELECT background_id, roll_index, skill_id, specialization_id, specialization_label
FROM background_growth;

CREATE TEMP TABLE _region_culture_background_bak AS
SELECT region_id, race_id, background_id, sort_order
FROM region_culture_background;

DROP TABLE region_culture_background;
DROP TABLE background_growth;
DROP TABLE background;

ALTER TABLE background_new RENAME TO background;

CREATE TABLE background_growth (
	background_id         INTEGER NOT NULL REFERENCES background (id) ON DELETE CASCADE,
	roll_index            INTEGER NOT NULL CHECK (roll_index BETWEEN 1 AND 8),
	grant_kind            TEXT NOT NULL DEFAULT 'skill'
		CHECK (grant_kind IN ('skill', 'anyCombat', 'anySkill')),
	skill_id              INTEGER REFERENCES skill (id),
	specialization_id     INTEGER REFERENCES specialization (id),
	specialization_label  TEXT NOT NULL DEFAULT '',
	PRIMARY KEY (background_id, roll_index),
	CHECK (
		(grant_kind = 'skill' AND skill_id IS NOT NULL)
		OR (grant_kind != 'skill' AND skill_id IS NULL
			AND specialization_id IS NULL
			AND specialization_label = '')
	)
);

INSERT INTO background_growth (
	background_id, roll_index, grant_kind, skill_id, specialization_id, specialization_label
)
SELECT
	background_id, roll_index, 'skill', skill_id, specialization_id, specialization_label
FROM _background_growth_bak;

CREATE TABLE region_culture_background (
	region_id     INTEGER NOT NULL,
	race_id       INTEGER NOT NULL,
	background_id INTEGER NOT NULL REFERENCES background (id) ON DELETE CASCADE,
	sort_order    INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (region_id, race_id, background_id),
	FOREIGN KEY (region_id, race_id) REFERENCES region_culture (region_id, race_id) ON DELETE CASCADE
);

INSERT INTO region_culture_background (region_id, race_id, background_id, sort_order)
SELECT region_id, race_id, background_id, sort_order
FROM _region_culture_background_bak;

DROP TABLE _background_growth_bak;
DROP TABLE _region_culture_background_bak;

CREATE TRIGGER background_delete_translations
AFTER DELETE ON background
BEGIN
	DELETE FROM translation WHERE entity_kind = 'background' AND entity_id = OLD.id;
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
