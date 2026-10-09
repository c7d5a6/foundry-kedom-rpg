-- name: ListClasses :many
SELECT
	c.id, c.slug, c.label, c.description, c.comment, c.is_full, c.is_partial,
	c.hit_die,
	c.hit_die_priority,
	c.talent_picks_warrior, c.talent_picks_expert, c.talent_picks_any,
	c.save_primary, c.save_primary_priority, c.save_secondary, c.save_secondary_priority,
	c.effort_skill_key, c.effort_ability_key_1, c.effort_ability_key_2, c.art_slots_json,
	c.sort_order, c.foundry_id
FROM class c
ORDER BY c.sort_order, c.id;

-- name: GetClass :one
SELECT
	c.id, c.slug, c.label, c.description, c.comment, c.is_full, c.is_partial,
	c.hit_die,
	c.hit_die_priority,
	c.talent_picks_warrior, c.talent_picks_expert, c.talent_picks_any,
	c.save_primary, c.save_primary_priority, c.save_secondary, c.save_secondary_priority,
	c.effort_skill_key, c.effort_ability_key_1, c.effort_ability_key_2, c.art_slots_json,
	c.sort_order, c.foundry_id
FROM class c
WHERE c.id = ?;

-- name: GetClassBySlug :one
SELECT
	c.id, c.slug, c.label, c.description, c.comment, c.is_full, c.is_partial,
	c.hit_die,
	c.hit_die_priority,
	c.talent_picks_warrior, c.talent_picks_expert, c.talent_picks_any,
	c.save_primary, c.save_primary_priority, c.save_secondary, c.save_secondary_priority,
	c.effort_skill_key, c.effort_ability_key_1, c.effort_ability_key_2, c.art_slots_json,
	c.sort_order, c.foundry_id
FROM class c
WHERE c.slug = ?;

-- name: UpdateClass :one
UPDATE class
SET label = ?, description = ?, comment = ?, sort_order = ?,
	is_full = ?, is_partial = ?,
	hit_die = ?, hit_die_priority = ?,
	talent_picks_warrior = ?, talent_picks_expert = ?, talent_picks_any = ?,
	save_primary = ?, save_primary_priority = ?,
	save_secondary = ?, save_secondary_priority = ?,
	effort_skill_key = ?, effort_ability_key_1 = ?, effort_ability_key_2 = ?, art_slots_json = ?
WHERE id = ?
RETURNING
	id, slug, label, description, comment, is_full, is_partial,
	hit_die,
	hit_die_priority,
	talent_picks_warrior, talent_picks_expert, talent_picks_any,
	save_primary, save_primary_priority, save_secondary, save_secondary_priority,
	effort_skill_key, effort_ability_key_1, effort_ability_key_2, art_slots_json,
	sort_order, foundry_id;

-- name: ClassSlugExists :one
SELECT EXISTS(SELECT 1 FROM class WHERE slug = ?) AS present;

-- name: InsertClass :one
INSERT INTO class (
	slug, label, description, comment, is_full, is_partial,
	hit_die, hit_die_priority,
	talent_picks_warrior, talent_picks_expert, talent_picks_any,
	save_primary, save_primary_priority, save_secondary, save_secondary_priority,
	effort_skill_key, effort_ability_key_1, effort_ability_key_2, art_slots_json,
	sort_order, foundry_id
) VALUES (
	?, ?, ?, ?, ?, ?,
	?, ?,
	?, ?, ?,
	?, ?, ?, ?,
	?, ?, ?, ?,
	?, ?
)
RETURNING
	id, slug, label, description, comment, is_full, is_partial,
	hit_die,
	hit_die_priority,
	talent_picks_warrior, talent_picks_expert, talent_picks_any,
	save_primary, save_primary_priority, save_secondary, save_secondary_priority,
	effort_skill_key, effort_ability_key_1, effort_ability_key_2, art_slots_json,
	sort_order, foundry_id;

-- name: DeleteClass :exec
DELETE FROM class WHERE id = ?;

-- name: ListRaceClassesByClass :many
SELECT
	rc.race_id, rc.class_id,
	r.slug AS race_slug, r.label AS race_label
FROM race_class rc
JOIN race r ON r.id = rc.race_id
WHERE rc.class_id = ?
ORDER BY r.sort_order, r.id;

-- name: ListClassTalents :many
SELECT
	ct.class_id, ct.talent_id, ct.sort_order,
	t.slug AS talent_slug, t.label AS talent_label
FROM class_talent ct
JOIN talent t ON t.id = ct.talent_id
WHERE ct.class_id = ?
ORDER BY ct.sort_order, t.id;

-- name: DeleteClassTalents :exec
DELETE FROM class_talent WHERE class_id = ?;

-- name: InsertClassTalent :exec
INSERT INTO class_talent (class_id, talent_id, sort_order) VALUES (?, ?, ?);
