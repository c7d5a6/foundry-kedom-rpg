-- name: ListTranslationsForEntity :many
SELECT id, entity_kind, entity_id, locale, field, value
FROM translation
WHERE entity_kind = ? AND entity_id = ? AND locale = ?
ORDER BY field;

-- name: UpsertTranslation :one
INSERT INTO translation (entity_kind, entity_id, locale, field, value)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (entity_kind, entity_id, locale, field)
DO UPDATE SET value = excluded.value
RETURNING id, entity_kind, entity_id, locale, field, value;

-- name: DeleteTranslation :exec
DELETE FROM translation
WHERE entity_kind = ? AND entity_id = ? AND locale = ? AND field = ?;

-- name: ListAllTranslationsForLocale :many
SELECT id, entity_kind, entity_id, locale, field, value
FROM translation
WHERE locale = ?
ORDER BY entity_kind, entity_id, field;
