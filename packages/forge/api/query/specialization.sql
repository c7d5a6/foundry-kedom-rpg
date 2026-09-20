-- name: ListSpecializations :many
SELECT
	sp.id, sp.slug, sp.label, sp.description, sp.comment, sp.skill_id,
	sp.parameter, sp.sort_order, sp.foundry_id,
	s.slug AS skill_slug
FROM specialization sp
JOIN skill s ON s.id = sp.skill_id
ORDER BY s.sort_order, sp.sort_order, sp.id;

-- name: ListSpecializationsBySkill :many
SELECT
	sp.id, sp.slug, sp.label, sp.description, sp.comment, sp.skill_id,
	sp.parameter, sp.sort_order, sp.foundry_id,
	s.slug AS skill_slug
FROM specialization sp
JOIN skill s ON s.id = sp.skill_id
WHERE sp.skill_id = ?
ORDER BY sp.sort_order, sp.id;

-- name: GetSpecialization :one
SELECT
	sp.id, sp.slug, sp.label, sp.description, sp.comment, sp.skill_id,
	sp.parameter, sp.sort_order, sp.foundry_id,
	s.slug AS skill_slug
FROM specialization sp
JOIN skill s ON s.id = sp.skill_id
WHERE sp.id = ?;

-- name: UpdateSpecialization :one
UPDATE specialization
SET label = ?, description = ?, comment = ?, sort_order = ?
WHERE id = ?
RETURNING id, slug, label, description, comment, skill_id, parameter, sort_order, foundry_id;
