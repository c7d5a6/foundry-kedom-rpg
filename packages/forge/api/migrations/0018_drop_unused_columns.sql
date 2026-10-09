-- Drop unused scaffolding: class progression stubs, race parent link,
-- and race_class prefilled Adventurer flag (never authored or exported).

ALTER TABLE class DROP COLUMN attack_progression;
ALTER TABLE class DROP COLUMN skill_points_per_level;
ALTER TABLE race DROP COLUMN parent_race_id;

CREATE TABLE race_class_new (
	race_id  INTEGER NOT NULL REFERENCES race (id) ON DELETE CASCADE,
	class_id INTEGER NOT NULL REFERENCES class (id) ON DELETE CASCADE,
	PRIMARY KEY (race_id, class_id)
);

INSERT INTO race_class_new (race_id, class_id)
SELECT race_id, class_id FROM race_class;

DROP TABLE race_class;
ALTER TABLE race_class_new RENAME TO race_class;
