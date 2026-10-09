-- Classes may grant multiple talents (ordered). Migrate the single FK into a junction.

CREATE TABLE class_talent (
	class_id   INTEGER NOT NULL REFERENCES class (id) ON DELETE CASCADE,
	talent_id  INTEGER NOT NULL REFERENCES talent (id),
	sort_order INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (class_id, talent_id)
);

INSERT INTO class_talent (class_id, talent_id, sort_order)
SELECT id, talent_id, 0 FROM class WHERE talent_id IS NOT NULL;

ALTER TABLE class DROP COLUMN talent_id;
