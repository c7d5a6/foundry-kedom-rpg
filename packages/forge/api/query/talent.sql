-- name: ListTalents :many
SELECT id, slug, label, description, comment, category, feature_key, grants_json, sort_order, foundry_id, effects_json
FROM talent
ORDER BY sort_order, id;

-- name: GetTalent :one
SELECT id, slug, label, description, comment, category, feature_key, grants_json, sort_order, foundry_id, effects_json
FROM talent
WHERE id = ?;

-- name: GetTalentBySlug :one
SELECT id, slug, label, description, comment, category, feature_key, grants_json, sort_order, foundry_id, effects_json
FROM talent
WHERE slug = ?;

-- name: InsertTalent :one
INSERT INTO talent (
	slug, label, description, comment, category, feature_key, grants_json, sort_order, foundry_id, effects_json
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, slug, label, description, comment, category, feature_key, grants_json, sort_order, foundry_id, effects_json;

-- name: UpdateTalent :one
UPDATE talent
SET label = ?, description = ?, comment = ?, category = ?, feature_key = ?, grants_json = ?, sort_order = ?, effects_json = ?
WHERE id = ?
RETURNING id, slug, label, description, comment, category, feature_key, grants_json, sort_order, foundry_id, effects_json;

-- name: TalentSlugExists :one
SELECT EXISTS(SELECT 1 FROM talent WHERE slug = ?) AS present;

-- name: DeleteTalent :exec
DELETE FROM talent WHERE id = ?;

-- name: ListRacesByTalent :many
SELECT id, slug, label FROM race WHERE talent_id = ? ORDER BY sort_order, id;

-- name: ListClassesByTalent :many
SELECT id, slug, label FROM class WHERE talent_id = ? ORDER BY sort_order, id;
