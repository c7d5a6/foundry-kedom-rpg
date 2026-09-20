-- Core vocabulary tables for Forge v1: attributes, skills, specializations,
-- classes, and the Russian translation overlay. Race/background/region come later.

PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
	version    TEXT NOT NULL PRIMARY KEY,
	applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE attribute (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	slug         TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9]*'),
	label        TEXT NOT NULL CHECK (length(label) > 0),
	abbreviation TEXT NOT NULL CHECK (length(abbreviation) > 0),
	description  TEXT NOT NULL DEFAULT '',
	sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE skill (
	id                   INTEGER PRIMARY KEY AUTOINCREMENT,
	slug                 TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9]*'),
	label                TEXT NOT NULL CHECK (length(label) > 0),
	description          TEXT NOT NULL DEFAULT '',
	attribute_id         INTEGER NOT NULL REFERENCES attribute (id),
	specialization_mode  TEXT NOT NULL
		CHECK (specialization_mode IN ('none', 'fixed', 'free', 'parameterized')),
	is_secondary         INTEGER NOT NULL DEFAULT 0 CHECK (is_secondary IN (0, 1)),
	sort_order           INTEGER NOT NULL DEFAULT 0,
	foundry_id           TEXT NOT NULL UNIQUE
		CHECK (length(foundry_id) = 16 AND foundry_id NOT GLOB '*[^A-Za-z0-9]*')
);

CREATE TABLE specialization (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	slug        TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9.]*'),
	label       TEXT NOT NULL CHECK (length(label) > 0),
	description TEXT NOT NULL DEFAULT '',
	skill_id    INTEGER NOT NULL REFERENCES skill (id) ON DELETE CASCADE,
	parameter   TEXT CHECK (parameter IS NULL OR parameter IN ('environment', 'pantheon', 'culture')),
	sort_order  INTEGER NOT NULL DEFAULT 0,
	foundry_id  TEXT NOT NULL UNIQUE
		CHECK (length(foundry_id) = 16 AND foundry_id NOT GLOB '*[^A-Za-z0-9]*')
);

CREATE TABLE class (
	id                     INTEGER PRIMARY KEY AUTOINCREMENT,
	slug                   TEXT NOT NULL UNIQUE
		CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9-]*'),
	label                  TEXT NOT NULL CHECK (length(label) > 0),
	description            TEXT NOT NULL DEFAULT '',
	is_full                INTEGER NOT NULL DEFAULT 0 CHECK (is_full IN (0, 1)),
	is_partial             INTEGER NOT NULL DEFAULT 0 CHECK (is_partial IN (0, 1)),
	attack_progression     TEXT,
	skill_points_per_level INTEGER,
	hit_die                TEXT,
	sort_order             INTEGER NOT NULL DEFAULT 0,
	foundry_id             TEXT NOT NULL UNIQUE
		CHECK (length(foundry_id) = 16 AND foundry_id NOT GLOB '*[^A-Za-z0-9]*'),
	CHECK (is_full = 1 OR is_partial = 1)
);

CREATE TABLE translation (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	entity_kind TEXT NOT NULL
		CHECK (entity_kind IN (
			'attribute', 'skill', 'specialization', 'class',
			'background', 'region', 'focus', 'power', 'condition', 'injury', 'race'
		)),
	entity_id   INTEGER NOT NULL,
	locale      TEXT NOT NULL CHECK (locale != 'en' AND length(locale) > 0),
	field       TEXT NOT NULL CHECK (field IN ('label', 'abbreviation', 'description')),
	value       TEXT NOT NULL CHECK (length(value) > 0),
	UNIQUE (entity_kind, entity_id, locale, field)
);

-- Reject translations whose entity_id does not exist in the kind's table.
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
	END;
END;

-- Cascade-delete translations when a parent row is removed.
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
