-- name: ListSkills :many
SELECT
	s.id, s.slug, s.label, s.description, s.comment, s.attribute_id,
	s.specialization_mode, s.is_secondary, s.sort_order, s.foundry_id,
	a.slug AS attribute_slug
FROM skill s
JOIN attribute a ON a.id = s.attribute_id
ORDER BY s.sort_order, s.id;

-- name: GetSkill :one
SELECT
	s.id, s.slug, s.label, s.description, s.comment, s.attribute_id,
	s.specialization_mode, s.is_secondary, s.sort_order, s.foundry_id,
	a.slug AS attribute_slug
FROM skill s
JOIN attribute a ON a.id = s.attribute_id
WHERE s.id = ?;

-- name: UpdateSkill :one
UPDATE skill
SET label = ?, description = ?, comment = ?, sort_order = ?
WHERE id = ?
RETURNING id, slug, label, description, comment, attribute_id, specialization_mode, is_secondary, sort_order, foundry_id;
