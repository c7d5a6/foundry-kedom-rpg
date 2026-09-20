-- name: ListAttributes :many
SELECT id, slug, label, abbreviation, description, comment, sort_order
FROM attribute
ORDER BY sort_order, id;

-- name: GetAttribute :one
SELECT id, slug, label, abbreviation, description, comment, sort_order
FROM attribute
WHERE id = ?;

-- name: UpdateAttribute :one
UPDATE attribute
SET label = ?, abbreviation = ?, description = ?, comment = ?, sort_order = ?
WHERE id = ?
RETURNING id, slug, label, abbreviation, description, comment, sort_order;
