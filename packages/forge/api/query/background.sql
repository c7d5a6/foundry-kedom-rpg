-- name: ListBackgrounds :many
SELECT
	b.id, b.slug, b.label, b.description, b.comment,
	b.free_skill_id, b.free_specialization_id, b.sort_order, b.foundry_id,
	s.slug AS free_skill_slug,
	sp.slug AS free_specialization_slug
FROM background b
JOIN skill s ON s.id = b.free_skill_id
LEFT JOIN specialization sp ON sp.id = b.free_specialization_id
ORDER BY b.sort_order, b.id;

-- name: GetBackground :one
SELECT
	b.id, b.slug, b.label, b.description, b.comment,
	b.free_skill_id, b.free_specialization_id, b.sort_order, b.foundry_id,
	s.slug AS free_skill_slug,
	sp.slug AS free_specialization_slug
FROM background b
JOIN skill s ON s.id = b.free_skill_id
LEFT JOIN specialization sp ON sp.id = b.free_specialization_id
WHERE b.id = ?;

-- name: GetBackgroundBySlug :one
SELECT
	b.id, b.slug, b.label, b.description, b.comment,
	b.free_skill_id, b.free_specialization_id, b.sort_order, b.foundry_id,
	s.slug AS free_skill_slug,
	sp.slug AS free_specialization_slug
FROM background b
JOIN skill s ON s.id = b.free_skill_id
LEFT JOIN specialization sp ON sp.id = b.free_specialization_id
WHERE b.slug = ?;

-- name: InsertBackground :one
INSERT INTO background (
	slug, label, description, comment,
	free_skill_id, free_specialization_id, sort_order, foundry_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, slug, label, description, comment, free_skill_id, free_specialization_id, sort_order, foundry_id;

-- name: UpdateBackground :one
UPDATE background
SET label = ?, description = ?, comment = ?,
	free_skill_id = ?, free_specialization_id = ?, sort_order = ?
WHERE id = ?
RETURNING id, slug, label, description, comment, free_skill_id, free_specialization_id, sort_order, foundry_id;

-- name: BackgroundSlugExists :one
SELECT EXISTS(SELECT 1 FROM background WHERE slug = ?) AS present;

-- name: ListBackgroundGrowth :many
SELECT
	bg.background_id, bg.roll_index, bg.skill_id, bg.specialization_id,
	s.slug AS skill_slug,
	sp.slug AS specialization_slug
FROM background_growth bg
JOIN skill s ON s.id = bg.skill_id
LEFT JOIN specialization sp ON sp.id = bg.specialization_id
WHERE bg.background_id = ?
ORDER BY bg.roll_index;

-- name: DeleteBackgroundGrowth :exec
DELETE FROM background_growth WHERE background_id = ?;

-- name: InsertBackgroundGrowth :exec
INSERT INTO background_growth (background_id, roll_index, skill_id, specialization_id)
VALUES (?, ?, ?, ?);

-- name: DeleteBackground :exec
DELETE FROM background WHERE id = ?;

-- name: ListRegionCultureBackgroundsByBackground :many
SELECT
	rcb.region_id, rcb.race_id, rcb.background_id, rcb.sort_order,
	reg.slug AS region_slug, reg.label AS region_label,
	r.slug AS race_slug, r.label AS race_label
FROM region_culture_background rcb
JOIN region reg ON reg.id = rcb.region_id
JOIN race r ON r.id = rcb.race_id
WHERE rcb.background_id = ?
ORDER BY reg.sort_order, reg.id, r.sort_order, r.id, rcb.sort_order;
