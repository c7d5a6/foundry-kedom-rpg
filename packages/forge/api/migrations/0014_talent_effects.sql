-- Talents may carry any number of transferable Active Effects.
-- Additive: existing rows get an empty array. Identity columns are untouched.

ALTER TABLE talent ADD COLUMN effects_json TEXT NOT NULL DEFAULT '[]'
	CHECK (json_valid(effects_json) AND json_type(effects_json) = 'array');
