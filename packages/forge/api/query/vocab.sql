-- name: ListVocab :many
SELECT id, kind, slug, label, abbreviation, sort_order, comment
FROM vocab
ORDER BY kind, sort_order, id;

-- name: ListVocabByKind :many
SELECT id, kind, slug, label, abbreviation, sort_order, comment
FROM vocab
WHERE kind = ?
ORDER BY sort_order, id;

-- name: GetVocab :one
SELECT id, kind, slug, label, abbreviation, sort_order, comment
FROM vocab
WHERE id = ?;

-- name: UpdateVocab :one
UPDATE vocab
SET label = ?, abbreviation = ?, comment = ?, sort_order = ?
WHERE id = ?
RETURNING id, kind, slug, label, abbreviation, sort_order, comment;
