-- Authored freeform specialization labels on backgrounds (English only; no translation).
-- Catalog picks still use specialization_id; freeform uses these label columns.

ALTER TABLE background ADD COLUMN free_specialization_label TEXT NOT NULL DEFAULT '';

ALTER TABLE background_growth ADD COLUMN specialization_label TEXT NOT NULL DEFAULT '';
