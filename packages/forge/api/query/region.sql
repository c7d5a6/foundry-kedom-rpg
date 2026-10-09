-- name: ListRegions :many
SELECT id, slug, label, description, comment, sort_order, foundry_id, banner_img
FROM region
ORDER BY sort_order, id;

-- name: GetRegion :one
SELECT id, slug, label, description, comment, sort_order, foundry_id, banner_img
FROM region
WHERE id = ?;

-- name: GetRegionBySlug :one
SELECT id, slug, label, description, comment, sort_order, foundry_id, banner_img
FROM region
WHERE slug = ?;

-- name: InsertRegion :one
INSERT INTO region (slug, label, description, comment, sort_order, foundry_id, banner_img)
VALUES (?, ?, ?, ?, ?, ?, ?)
RETURNING id, slug, label, description, comment, sort_order, foundry_id, banner_img;

-- name: UpdateRegion :one
UPDATE region
SET label = ?, description = ?, comment = ?, sort_order = ?, banner_img = ?
WHERE id = ?
RETURNING id, slug, label, description, comment, sort_order, foundry_id, banner_img;

-- name: RegionSlugExists :one
SELECT EXISTS(SELECT 1 FROM region WHERE slug = ?) AS present;

-- name: ListRegionCultures :many
SELECT
	rc.region_id, rc.race_id, rc.weight,
	r.slug AS race_slug, r.label AS race_label
FROM region_culture rc
JOIN race r ON r.id = rc.race_id
WHERE rc.region_id = ?
ORDER BY r.sort_order, r.id;

-- name: DeleteRegionCultures :exec
DELETE FROM region_culture WHERE region_id = ?;

-- name: InsertRegionCulture :exec
INSERT INTO region_culture (region_id, race_id, weight) VALUES (?, ?, ?);

-- name: ListRegionCultureBackgrounds :many
SELECT
	rcb.region_id, rcb.race_id, rcb.background_id, rcb.sort_order,
	b.slug AS background_slug, b.label AS background_label,
	r.slug AS race_slug
FROM region_culture_background rcb
JOIN background b ON b.id = rcb.background_id
JOIN race r ON r.id = rcb.race_id
WHERE rcb.region_id = ?
ORDER BY r.sort_order, r.id, rcb.sort_order, b.id;

-- name: DeleteRegionCultureBackgrounds :exec
DELETE FROM region_culture_background WHERE region_id = ?;

-- name: InsertRegionCultureBackground :exec
INSERT INTO region_culture_background (region_id, race_id, background_id, sort_order)
VALUES (?, ?, ?, ?);

-- name: DeleteRegion :exec
DELETE FROM region WHERE id = ?;
