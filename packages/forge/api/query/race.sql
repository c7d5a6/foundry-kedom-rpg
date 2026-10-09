-- name: ListRaces :many
SELECT
	r.id, r.slug, r.label, r.description, r.comment, r.talent_id,
	r.sort_order, r.foundry_id,
	t.slug AS talent_slug
FROM race r
LEFT JOIN talent t ON t.id = r.talent_id
ORDER BY r.sort_order, r.id;

-- name: GetRace :one
SELECT
	r.id, r.slug, r.label, r.description, r.comment, r.talent_id,
	r.sort_order, r.foundry_id,
	t.slug AS talent_slug
FROM race r
LEFT JOIN talent t ON t.id = r.talent_id
WHERE r.id = ?;

-- name: GetRaceBySlug :one
SELECT
	r.id, r.slug, r.label, r.description, r.comment, r.talent_id,
	r.sort_order, r.foundry_id,
	t.slug AS talent_slug
FROM race r
LEFT JOIN talent t ON t.id = r.talent_id
WHERE r.slug = ?;

-- name: InsertRace :one
INSERT INTO race (slug, label, description, comment, talent_id, sort_order, foundry_id)
VALUES (?, ?, ?, ?, ?, ?, ?)
RETURNING id, slug, label, description, comment, talent_id, sort_order, foundry_id;

-- name: UpdateRace :one
UPDATE race
SET label = ?, description = ?, comment = ?, talent_id = ?, sort_order = ?
WHERE id = ?
RETURNING id, slug, label, description, comment, talent_id, sort_order, foundry_id;

-- name: RaceSlugExists :one
SELECT EXISTS(SELECT 1 FROM race WHERE slug = ?) AS present;

-- name: ListRaceClasses :many
SELECT rc.race_id, rc.class_id, c.slug AS class_slug, c.label AS class_label
FROM race_class rc
JOIN class c ON c.id = rc.class_id
WHERE rc.race_id = ?
ORDER BY c.sort_order, c.id;

-- name: DeleteRaceClasses :exec
DELETE FROM race_class WHERE race_id = ?;

-- name: InsertRaceClass :exec
INSERT INTO race_class (race_id, class_id) VALUES (?, ?);

-- name: DeleteRace :exec
DELETE FROM race WHERE id = ?;

-- name: ListRegionCulturesByRace :many
SELECT
	rc.region_id, rc.race_id, rc.weight,
	reg.slug AS region_slug, reg.label AS region_label
FROM region_culture rc
JOIN region reg ON reg.id = rc.region_id
WHERE rc.race_id = ?
ORDER BY reg.sort_order, reg.id;

-- name: ListRegionCultureBackgroundsByRace :many
SELECT
	rcb.region_id, rcb.race_id, rcb.background_id, rcb.sort_order,
	reg.slug AS region_slug, reg.label AS region_label,
	b.slug AS background_slug, b.label AS background_label
FROM region_culture_background rcb
JOIN region reg ON reg.id = rcb.region_id
JOIN background b ON b.id = rcb.background_id
WHERE rcb.race_id = ?
ORDER BY reg.sort_order, reg.id, rcb.sort_order, b.id;
