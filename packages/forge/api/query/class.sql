-- name: ListClasses :many
SELECT
	id, slug, label, description, comment, is_full, is_partial,
	attack_progression, skill_points_per_level, hit_die,
	sort_order, foundry_id
FROM class
ORDER BY sort_order, id;

-- name: GetClass :one
SELECT
	id, slug, label, description, comment, is_full, is_partial,
	attack_progression, skill_points_per_level, hit_die,
	sort_order, foundry_id
FROM class
WHERE id = ?;

-- name: UpdateClass :one
UPDATE class
SET label = ?, description = ?, comment = ?, sort_order = ?
WHERE id = ?
RETURNING
	id, slug, label, description, comment, is_full, is_partial,
	attack_progression, skill_points_per_level, hit_die,
	sort_order, foundry_id;
