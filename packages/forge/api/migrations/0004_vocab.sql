-- Closed-vocabulary terms for Foundry lang JSON (proficiency, outcomes, saves, …).
-- Attributes and skills stay on their existing tables.

PRAGMA foreign_keys = ON;

CREATE TABLE vocab (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	kind         TEXT NOT NULL
		CHECK (kind IN (
			'proficiency', 'outcome', 'save', 'difficulty', 'derived',
			'condition', 'injury_severity', 'injury_location', 'injury_weapon'
		)),
	slug         TEXT NOT NULL
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-zA-Z0-9]*'),
	label        TEXT NOT NULL CHECK (length(label) > 0),
	abbreviation TEXT NOT NULL DEFAULT '',
	sort_order   INTEGER NOT NULL DEFAULT 0,
	comment      TEXT NOT NULL DEFAULT '',
	UNIQUE (kind, slug)
);

-- Widen translation.entity_kind for vocab kinds (SQLite cannot ALTER CHECK).
CREATE TABLE translation_new (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	entity_kind TEXT NOT NULL
		CHECK (entity_kind IN (
			'attribute', 'skill', 'specialization', 'class',
			'background', 'region', 'focus', 'power', 'condition', 'injury', 'race',
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

-- Parent delete triggers reference translation; drop them before replacing the table.
DROP TRIGGER IF EXISTS translation_insert_entity_exists;
DROP TRIGGER IF EXISTS translation_update_entity_exists;
DROP TRIGGER IF EXISTS attribute_delete_translations;
DROP TRIGGER IF EXISTS skill_delete_translations;
DROP TRIGGER IF EXISTS specialization_delete_translations;
DROP TRIGGER IF EXISTS class_delete_translations;

DROP TABLE translation;
ALTER TABLE translation_new RENAME TO translation;

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
