-- Shared authoring note on every content entity. Not localised: one field for all locales.
ALTER TABLE attribute ADD COLUMN comment TEXT NOT NULL DEFAULT '';
ALTER TABLE skill ADD COLUMN comment TEXT NOT NULL DEFAULT '';
ALTER TABLE specialization ADD COLUMN comment TEXT NOT NULL DEFAULT '';
ALTER TABLE class ADD COLUMN comment TEXT NOT NULL DEFAULT '';
