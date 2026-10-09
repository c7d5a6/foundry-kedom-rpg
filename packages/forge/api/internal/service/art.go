package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/repository/generated"
)

var artCommitments = map[string]struct{}{
	"scene":         {},
	"day":           {},
	"concentration": {},
	"free":          {},
}

type ArtDTO struct {
	ID           int64          `json:"id"`
	Slug         string         `json:"slug"`
	Label        string         `json:"label"`
	Description  string         `json:"description"`
	Comment      string         `json:"comment"`
	ClassID      int64          `json:"class_id"`
	ClassSlug    string         `json:"class_slug"`
	ClassLabel   string         `json:"class_label"`
	Commitment   string         `json:"commitment"`
	EffectsJSON  string         `json:"effects_json"`
	SortOrder    int64          `json:"sort_order"`
	FoundryID    string         `json:"foundry_id"`
	Translations TranslationMap `json:"translations"`
}

func artDTOFromListRow(
	id int64,
	slug, label, description, comment string,
	classID int64, classSlug, classLabel, commitment, effectsJSON string,
	sortOrder int64, foundryID string,
	tr TranslationMap,
) ArtDTO {
	return ArtDTO{
		ID: id, Slug: slug, Label: label, Description: description, Comment: comment,
		ClassID: classID, ClassSlug: classSlug, ClassLabel: classLabel,
		Commitment: commitment, EffectsJSON: effectsJSON,
		SortOrder: sortOrder, FoundryID: foundryID, Translations: tr,
	}
}

func (c *Content) ListArts(ctx context.Context, locale model.Locale) ([]ArtDTO, error) {
	rows, err := c.q.ListArts(ctx)
	if err != nil {
		return nil, fmt.Errorf("list arts: %w", err)
	}
	out := make([]ArtDTO, 0, len(rows))
	for _, row := range rows {
		tr, err := c.translations(ctx, model.EntityArt, row.ID, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, artDTOFromListRow(
			row.ID, row.Slug, row.Label, row.Description, row.Comment,
			row.ClassID, row.ClassSlug, row.ClassLabel, row.Commitment, row.EffectsJson,
			row.SortOrder, row.FoundryID, tr,
		))
	}
	return out, nil
}

func (c *Content) ListArtsByClass(ctx context.Context, classID int64, locale model.Locale) ([]ArtDTO, error) {
	rows, err := c.q.ListArtsByClass(ctx, classID)
	if err != nil {
		return nil, fmt.Errorf("list arts by class: %w", err)
	}
	out := make([]ArtDTO, 0, len(rows))
	for _, row := range rows {
		tr, err := c.translations(ctx, model.EntityArt, row.ID, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, artDTOFromListRow(
			row.ID, row.Slug, row.Label, row.Description, row.Comment,
			row.ClassID, row.ClassSlug, row.ClassLabel, row.Commitment, row.EffectsJson,
			row.SortOrder, row.FoundryID, tr,
		))
	}
	return out, nil
}

func (c *Content) GetArt(ctx context.Context, id int64, locale model.Locale) (ArtDTO, error) {
	row, err := c.q.GetArt(ctx, id)
	if err != nil {
		return ArtDTO{}, mapNotFound(err)
	}
	tr, err := c.translations(ctx, model.EntityArt, row.ID, locale)
	if err != nil {
		return ArtDTO{}, err
	}
	return artDTOFromListRow(
		row.ID, row.Slug, row.Label, row.Description, row.Comment,
		row.ClassID, row.ClassSlug, row.ClassLabel, row.Commitment, row.EffectsJson,
		row.SortOrder, row.FoundryID, tr,
	), nil
}

type CreateArtInput struct {
	Label       string `json:"label"`
	Description string `json:"description"`
	Comment     string `json:"comment"`
	ClassID     int64  `json:"class_id"`
	Commitment  string `json:"commitment"`
	EffectsJSON string `json:"effects_json"`
	SortOrder   int64  `json:"sort_order"`
}

func (c *Content) CreateArt(ctx context.Context, in CreateArtInput, locale model.Locale) (ArtDTO, error) {
	label := strings.TrimSpace(in.Label)
	if label == "" {
		return ArtDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	if in.ClassID <= 0 {
		return ArtDTO{}, fmt.Errorf("%w: class_id required", ErrInvalid)
	}
	if _, err := c.q.GetClass(ctx, in.ClassID); err != nil {
		return ArtDTO{}, mapNotFound(err)
	}
	commitment := strings.TrimSpace(in.Commitment)
	if commitment == "" {
		commitment = "scene"
	}
	if _, ok := artCommitments[commitment]; !ok {
		return ArtDTO{}, fmt.Errorf("%w: invalid commitment %q", ErrInvalid, commitment)
	}
	effects, err := NormalizeTalentEffects(in.EffectsJSON, NewFoundryID)
	if err != nil {
		return ArtDTO{}, err
	}
	slug, err := UniqueSlug(SlugFromLabel(label), func(s string) (bool, error) {
		return c.q.ArtSlugExists(ctx, s)
	})
	if err != nil {
		return ArtDTO{}, err
	}
	fid, err := NewFoundryID()
	if err != nil {
		return ArtDTO{}, err
	}
	row, err := c.q.InsertArt(ctx, generated.InsertArtParams{
		Slug: slug, Label: label, Description: in.Description, Comment: in.Comment,
		ClassID: in.ClassID, Commitment: commitment, EffectsJson: effects,
		SortOrder: in.SortOrder, FoundryID: fid,
	})
	if err != nil {
		return ArtDTO{}, fmt.Errorf("insert art: %w", err)
	}
	return c.GetArt(ctx, row.ID, locale)
}

type UpdateArtInput struct {
	Label       string `json:"label"`
	Description string `json:"description"`
	Comment     string `json:"comment"`
	ClassID     int64  `json:"class_id"`
	Commitment  string `json:"commitment"`
	EffectsJSON string `json:"effects_json"`
	SortOrder   int64  `json:"sort_order"`
}

func (c *Content) UpdateArt(ctx context.Context, id int64, in UpdateArtInput, locale model.Locale) (ArtDTO, error) {
	if strings.TrimSpace(in.Label) == "" {
		return ArtDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	if in.ClassID <= 0 {
		return ArtDTO{}, fmt.Errorf("%w: class_id required", ErrInvalid)
	}
	if _, err := c.q.GetClass(ctx, in.ClassID); err != nil {
		return ArtDTO{}, mapNotFound(err)
	}
	commitment := strings.TrimSpace(in.Commitment)
	if commitment == "" {
		commitment = "scene"
	}
	if _, ok := artCommitments[commitment]; !ok {
		return ArtDTO{}, fmt.Errorf("%w: invalid commitment %q", ErrInvalid, commitment)
	}
	effects, err := NormalizeTalentEffects(in.EffectsJSON, NewFoundryID)
	if err != nil {
		return ArtDTO{}, err
	}
	_, err = c.q.UpdateArt(ctx, generated.UpdateArtParams{
		Label: in.Label, Description: in.Description, Comment: in.Comment,
		ClassID: in.ClassID, Commitment: commitment, EffectsJson: effects,
		SortOrder: in.SortOrder, ID: id,
	})
	if err != nil {
		return ArtDTO{}, mapNotFound(err)
	}
	return c.GetArt(ctx, id, locale)
}

func (c *Content) DeleteArt(ctx context.Context, id int64) error {
	if _, err := c.q.GetArt(ctx, id); err != nil {
		return mapNotFound(err)
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if err := q.DeleteTranslationsForEntity(ctx, generated.DeleteTranslationsForEntityParams{
		EntityKind: string(model.EntityArt), EntityID: id,
	}); err != nil {
		return err
	}
	if err := q.DeleteArt(ctx, id); err != nil {
		return fmt.Errorf("delete art: %w", err)
	}
	return tx.Commit()
}

// DefaultArtSlotsJSON is ten zeros for levels 1–10.
const DefaultArtSlotsJSON = "[0,0,0,0,0,0,0,0,0,0]"

func ParseArtSlots(raw string) []int64 {
	out := make([]int64, 10)
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return out
	}
	var parsed []int64
	if err := json.Unmarshal([]byte(trimmed), &parsed); err != nil {
		return out
	}
	for i := 0; i < 10 && i < len(parsed); i++ {
		if parsed[i] < 0 {
			out[i] = 0
		} else {
			out[i] = parsed[i]
		}
	}
	return out
}

func EncodeArtSlots(slots []int64) string {
	norm := make([]int64, 10)
	for i := 0; i < 10 && i < len(slots); i++ {
		if slots[i] < 0 {
			norm[i] = 0
		} else {
			norm[i] = slots[i]
		}
	}
	b, err := json.Marshal(norm)
	if err != nil {
		return DefaultArtSlotsJSON
	}
	return string(b)
}
