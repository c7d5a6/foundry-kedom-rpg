-- Feature keys superseded by talentSlug + effects_json. Drop unused columns.

ALTER TABLE talent DROP COLUMN feature_key;
ALTER TABLE class DROP COLUMN class_talent_keys;
