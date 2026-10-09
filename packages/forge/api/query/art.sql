-- name: ListArts :many
SELECT
	a.id, a.slug, a.label, a.description, a.comment,
	a.class_id, c.slug AS class_slug, c.label AS class_label,
	a.commitment, a.effects_json, a.sort_order, a.foundry_id
FROM art a
JOIN class c ON c.id = a.class_id
ORDER BY a.sort_order, a.id;

-- name: ListArtsByClass :many
SELECT
	a.id, a.slug, a.label, a.description, a.comment,
	a.class_id, c.slug AS class_slug, c.label AS class_label,
	a.commitment, a.effects_json, a.sort_order, a.foundry_id
FROM art a
JOIN class c ON c.id = a.class_id
WHERE a.class_id = ?
ORDER BY a.sort_order, a.id;

-- name: GetArt :one
SELECT
	a.id, a.slug, a.label, a.description, a.comment,
	a.class_id, c.slug AS class_slug, c.label AS class_label,
	a.commitment, a.effects_json, a.sort_order, a.foundry_id
FROM art a
JOIN class c ON c.id = a.class_id
WHERE a.id = ?;

-- name: InsertArt :one
INSERT INTO art (
	slug, label, description, comment, class_id, commitment, effects_json, sort_order, foundry_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, slug, label, description, comment, class_id, commitment, effects_json, sort_order, foundry_id;

-- name: UpdateArt :one
UPDATE art
SET label = ?, description = ?, comment = ?, class_id = ?, commitment = ?, effects_json = ?, sort_order = ?
WHERE id = ?
RETURNING id, slug, label, description, comment, class_id, commitment, effects_json, sort_order, foundry_id;

-- name: ArtSlugExists :one
SELECT EXISTS(SELECT 1 FROM art WHERE slug = ?) AS present;

-- name: DeleteArt :exec
DELETE FROM art WHERE id = ?;
