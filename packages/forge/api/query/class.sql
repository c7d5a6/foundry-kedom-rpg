-- name: ListClasses :many
SELECT
	c.id, c.slug, c.label, c.description, c.comment, c.is_full, c.is_partial,
	c.attack_progression, c.skill_points_per_level, c.hit_die,
	c.talent_id, c.hit_die_priority,
	c.talent_picks_warrior, c.talent_picks_expert, c.talent_picks_any,
	c.save_primary, c.save_primary_priority, c.save_secondary, c.save_secondary_priority,
	c.arts_skill_key, c.class_talent_keys,
	c.sort_order, c.foundry_id,
	t.slug AS talent_slug
FROM class c
LEFT JOIN talent t ON t.id = c.talent_id
ORDER BY c.sort_order, c.id;

-- name: GetClass :one
SELECT
	c.id, c.slug, c.label, c.description, c.comment, c.is_full, c.is_partial,
	c.attack_progression, c.skill_points_per_level, c.hit_die,
	c.talent_id, c.hit_die_priority,
	c.talent_picks_warrior, c.talent_picks_expert, c.talent_picks_any,
	c.save_primary, c.save_primary_priority, c.save_secondary, c.save_secondary_priority,
	c.arts_skill_key, c.class_talent_keys,
	c.sort_order, c.foundry_id,
	t.slug AS talent_slug
FROM class c
LEFT JOIN talent t ON t.id = c.talent_id
WHERE c.id = ?;

-- name: GetClassBySlug :one
SELECT
	c.id, c.slug, c.label, c.description, c.comment, c.is_full, c.is_partial,
	c.attack_progression, c.skill_points_per_level, c.hit_die,
	c.talent_id, c.hit_die_priority,
	c.talent_picks_warrior, c.talent_picks_expert, c.talent_picks_any,
	c.save_primary, c.save_primary_priority, c.save_secondary, c.save_secondary_priority,
	c.arts_skill_key, c.class_talent_keys,
	c.sort_order, c.foundry_id,
	t.slug AS talent_slug
FROM class c
LEFT JOIN talent t ON t.id = c.talent_id
WHERE c.slug = ?;

-- name: UpdateClass :one
UPDATE class
SET label = ?, description = ?, comment = ?, sort_order = ?,
	hit_die = ?, talent_id = ?, hit_die_priority = ?,
	talent_picks_warrior = ?, talent_picks_expert = ?, talent_picks_any = ?,
	save_primary = ?, save_primary_priority = ?,
	save_secondary = ?, save_secondary_priority = ?,
	arts_skill_key = ?, class_talent_keys = ?
WHERE id = ?
RETURNING
	id, slug, label, description, comment, is_full, is_partial,
	attack_progression, skill_points_per_level, hit_die,
	talent_id, hit_die_priority,
	talent_picks_warrior, talent_picks_expert, talent_picks_any,
	save_primary, save_primary_priority, save_secondary, save_secondary_priority,
	arts_skill_key, class_talent_keys,
	sort_order, foundry_id;

-- name: ClassSlugExists :one
SELECT EXISTS(SELECT 1 FROM class WHERE slug = ?) AS present;

-- name: InsertClass :one
INSERT INTO class (
	slug, label, description, comment, is_full, is_partial,
	hit_die, talent_id, hit_die_priority,
	talent_picks_warrior, talent_picks_expert, talent_picks_any,
	save_primary, save_primary_priority, save_secondary, save_secondary_priority,
	arts_skill_key, class_talent_keys, sort_order, foundry_id
) VALUES (
	?, ?, ?, ?, ?, ?,
	?, ?, ?,
	?, ?, ?,
	?, ?, ?, ?,
	?, ?, ?, ?
)
RETURNING
	id, slug, label, description, comment, is_full, is_partial,
	attack_progression, skill_points_per_level, hit_die,
	talent_id, hit_die_priority,
	talent_picks_warrior, talent_picks_expert, talent_picks_any,
	save_primary, save_primary_priority, save_secondary, save_secondary_priority,
	arts_skill_key, class_talent_keys,
	sort_order, foundry_id;

-- name: DeleteClass :exec
DELETE FROM class WHERE id = ?;

-- name: ListRaceClassesByClass :many
SELECT
	rc.race_id, rc.class_id, rc.is_prefilled_slot,
	r.slug AS race_slug, r.label AS race_label
FROM race_class rc
JOIN race r ON r.id = rc.race_id
WHERE rc.class_id = ?
ORDER BY r.sort_order, r.id;
