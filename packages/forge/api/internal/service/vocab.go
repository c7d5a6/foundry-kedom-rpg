package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/repository/generated"
)

// VocabDTO is a closed-vocabulary term for the Forge UI / lang export.
type VocabDTO struct {
	ID           int64          `json:"id"`
	Kind         string         `json:"kind"`
	Slug         string         `json:"slug"`
	Label        string         `json:"label"`
	Abbreviation string         `json:"abbreviation"`
	SortOrder    int64          `json:"sort_order"`
	Comment      string         `json:"comment"`
	Translations TranslationMap `json:"translations"`
}

func (c *Content) ListVocab(ctx context.Context, locale model.Locale) ([]VocabDTO, error) {
	rows, err := c.q.ListVocab(ctx)
	if err != nil {
		return nil, fmt.Errorf("list vocab: %w", err)
	}
	return c.mapVocabRows(ctx, rows, locale)
}

func (c *Content) ListVocabByKind(ctx context.Context, kind model.EntityKind, locale model.Locale) ([]VocabDTO, error) {
	if !model.IsVocabKind(kind) {
		return nil, fmt.Errorf("%w: unknown vocab kind", ErrInvalid)
	}
	rows, err := c.q.ListVocabByKind(ctx, string(kind))
	if err != nil {
		return nil, fmt.Errorf("list vocab by kind: %w", err)
	}
	return c.mapVocabRows(ctx, rows, locale)
}

func (c *Content) GetVocab(ctx context.Context, id int64, locale model.Locale) (VocabDTO, error) {
	row, err := c.q.GetVocab(ctx, id)
	if err != nil {
		return VocabDTO{}, mapNotFound(err)
	}
	tr, err := c.translations(ctx, model.EntityKind(row.Kind), row.ID, locale)
	if err != nil {
		return VocabDTO{}, err
	}
	return VocabDTO{
		ID: row.ID, Kind: row.Kind, Slug: row.Slug, Label: row.Label,
		Abbreviation: row.Abbreviation, SortOrder: row.SortOrder, Comment: row.Comment,
		Translations: tr,
	}, nil
}

type UpdateVocabInput struct {
	Label        string `json:"label"`
	Abbreviation string `json:"abbreviation"`
	Comment      string `json:"comment"`
	SortOrder    int64  `json:"sort_order"`
}

func (c *Content) UpdateVocab(ctx context.Context, id int64, in UpdateVocabInput, locale model.Locale) (VocabDTO, error) {
	if strings.TrimSpace(in.Label) == "" {
		return VocabDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	_, err := c.q.UpdateVocab(ctx, generated.UpdateVocabParams{
		Label: in.Label, Abbreviation: in.Abbreviation,
		Comment: in.Comment, SortOrder: in.SortOrder, ID: id,
	})
	if err != nil {
		return VocabDTO{}, mapNotFound(err)
	}
	return c.GetVocab(ctx, id, locale)
}

func (c *Content) mapVocabRows(ctx context.Context, rows []generated.Vocab, locale model.Locale) ([]VocabDTO, error) {
	out := make([]VocabDTO, 0, len(rows))
	for _, row := range rows {
		tr, err := c.translations(ctx, model.EntityKind(row.Kind), row.ID, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, VocabDTO{
			ID: row.ID, Kind: row.Kind, Slug: row.Slug, Label: row.Label,
			Abbreviation: row.Abbreviation, SortOrder: row.SortOrder, Comment: row.Comment,
			Translations: tr,
		})
	}
	return out, nil
}
