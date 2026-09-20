package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/repository/generated"
)

var (
	ErrNotFound = errors.New("not found")
	ErrInvalid  = errors.New("invalid request")
)

// Content is the Forge authoring API for core vocabulary.
type Content struct {
	q *generated.Queries
}

func New(db *sql.DB) *Content {
	return &Content{q: generated.New(db)}
}

type TranslationMap map[model.TranslationField]string

type AttributeDTO struct {
	ID           int64          `json:"id"`
	Slug         string         `json:"slug"`
	Label        string         `json:"label"`
	Abbreviation string         `json:"abbreviation"`
	Description  string         `json:"description"`
	Comment      string         `json:"comment"`
	SortOrder    int64          `json:"sort_order"`
	Translations TranslationMap `json:"translations"`
}

type SkillDTO struct {
	ID                 int64          `json:"id"`
	Slug               string         `json:"slug"`
	Label              string         `json:"label"`
	Description        string         `json:"description"`
	Comment            string         `json:"comment"`
	AttributeID        int64          `json:"attribute_id"`
	AttributeSlug      string         `json:"attribute_slug"`
	SpecializationMode string         `json:"specialization_mode"`
	IsSecondary        bool           `json:"is_secondary"`
	SortOrder          int64          `json:"sort_order"`
	FoundryID          string         `json:"foundry_id"`
	Translations       TranslationMap `json:"translations"`
}

type SpecializationDTO struct {
	ID           int64          `json:"id"`
	Slug         string         `json:"slug"`
	Label        string         `json:"label"`
	Description  string         `json:"description"`
	Comment      string         `json:"comment"`
	SkillID      int64          `json:"skill_id"`
	SkillSlug    string         `json:"skill_slug"`
	Parameter    *string        `json:"parameter"`
	SortOrder    int64          `json:"sort_order"`
	FoundryID    string         `json:"foundry_id"`
	Translations TranslationMap `json:"translations"`
}

type ClassDTO struct {
	ID           int64          `json:"id"`
	Slug         string         `json:"slug"`
	Label        string         `json:"label"`
	Description  string         `json:"description"`
	Comment      string         `json:"comment"`
	IsFull       bool           `json:"is_full"`
	IsPartial    bool           `json:"is_partial"`
	SortOrder    int64          `json:"sort_order"`
	FoundryID    string         `json:"foundry_id"`
	Translations TranslationMap `json:"translations"`
}

type CompletenessItem struct {
	EntityKind string   `json:"entity_kind"`
	EntityID   int64    `json:"entity_id"`
	Slug       string   `json:"slug"`
	Label      string   `json:"label"`
	Missing    []string `json:"missing"`
}

func (c *Content) ListAttributes(ctx context.Context, locale model.Locale) ([]AttributeDTO, error) {
	rows, err := c.q.ListAttributes(ctx)
	if err != nil {
		return nil, fmt.Errorf("list attributes: %w", err)
	}
	out := make([]AttributeDTO, 0, len(rows))
	for _, row := range rows {
		tr, err := c.translations(ctx, model.EntityAttribute, row.ID, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, AttributeDTO{
			ID: row.ID, Slug: row.Slug, Label: row.Label,
			Abbreviation: row.Abbreviation, Description: row.Description, Comment: row.Comment,
			SortOrder: row.SortOrder, Translations: tr,
		})
	}
	return out, nil
}

func (c *Content) GetAttribute(ctx context.Context, id int64, locale model.Locale) (AttributeDTO, error) {
	row, err := c.q.GetAttribute(ctx, id)
	if err != nil {
		return AttributeDTO{}, mapNotFound(err)
	}
	tr, err := c.translations(ctx, model.EntityAttribute, row.ID, locale)
	if err != nil {
		return AttributeDTO{}, err
	}
	return AttributeDTO{
		ID: row.ID, Slug: row.Slug, Label: row.Label,
		Abbreviation: row.Abbreviation, Description: row.Description, Comment: row.Comment,
		SortOrder: row.SortOrder, Translations: tr,
	}, nil
}

type UpdateAttributeInput struct {
	Label        string `json:"label"`
	Abbreviation string `json:"abbreviation"`
	Description  string `json:"description"`
	Comment      string `json:"comment"`
	SortOrder    int64  `json:"sort_order"`
}

func (c *Content) UpdateAttribute(ctx context.Context, id int64, in UpdateAttributeInput, locale model.Locale) (AttributeDTO, error) {
	if strings.TrimSpace(in.Label) == "" || strings.TrimSpace(in.Abbreviation) == "" {
		return AttributeDTO{}, fmt.Errorf("%w: label and abbreviation required", ErrInvalid)
	}
	_, err := c.q.UpdateAttribute(ctx, generated.UpdateAttributeParams{
		Label: in.Label, Abbreviation: in.Abbreviation,
		Description: in.Description, Comment: in.Comment, SortOrder: in.SortOrder, ID: id,
	})
	if err != nil {
		return AttributeDTO{}, mapNotFound(err)
	}
	return c.GetAttribute(ctx, id, locale)
}

func (c *Content) ListSkills(ctx context.Context, locale model.Locale) ([]SkillDTO, error) {
	rows, err := c.q.ListSkills(ctx)
	if err != nil {
		return nil, fmt.Errorf("list skills: %w", err)
	}
	out := make([]SkillDTO, 0, len(rows))
	for _, row := range rows {
		tr, err := c.translations(ctx, model.EntitySkill, row.ID, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, SkillDTO{
			ID: row.ID, Slug: row.Slug, Label: row.Label, Description: row.Description, Comment: row.Comment,
			AttributeID: row.AttributeID, AttributeSlug: row.AttributeSlug,
			SpecializationMode: row.SpecializationMode, IsSecondary: row.IsSecondary,
			SortOrder: row.SortOrder, FoundryID: row.FoundryID, Translations: tr,
		})
	}
	return out, nil
}

func (c *Content) GetSkill(ctx context.Context, id int64, locale model.Locale) (SkillDTO, error) {
	row, err := c.q.GetSkill(ctx, id)
	if err != nil {
		return SkillDTO{}, mapNotFound(err)
	}
	tr, err := c.translations(ctx, model.EntitySkill, row.ID, locale)
	if err != nil {
		return SkillDTO{}, err
	}
	return SkillDTO{
		ID: row.ID, Slug: row.Slug, Label: row.Label, Description: row.Description, Comment: row.Comment,
		AttributeID: row.AttributeID, AttributeSlug: row.AttributeSlug,
		SpecializationMode: row.SpecializationMode, IsSecondary: row.IsSecondary,
		SortOrder: row.SortOrder, FoundryID: row.FoundryID, Translations: tr,
	}, nil
}

type UpdateSkillInput struct {
	Label       string `json:"label"`
	Description string `json:"description"`
	Comment     string `json:"comment"`
	SortOrder   int64  `json:"sort_order"`
}

func (c *Content) UpdateSkill(ctx context.Context, id int64, in UpdateSkillInput, locale model.Locale) (SkillDTO, error) {
	if strings.TrimSpace(in.Label) == "" {
		return SkillDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	_, err := c.q.UpdateSkill(ctx, generated.UpdateSkillParams{
		Label: in.Label, Description: in.Description, Comment: in.Comment, SortOrder: in.SortOrder, ID: id,
	})
	if err != nil {
		return SkillDTO{}, mapNotFound(err)
	}
	return c.GetSkill(ctx, id, locale)
}

func (c *Content) ListSpecializations(ctx context.Context, locale model.Locale) ([]SpecializationDTO, error) {
	rows, err := c.q.ListSpecializations(ctx)
	if err != nil {
		return nil, fmt.Errorf("list specializations: %w", err)
	}
	out := make([]SpecializationDTO, 0, len(rows))
	for _, row := range rows {
		tr, err := c.translations(ctx, model.EntitySpecialization, row.ID, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, SpecializationDTO{
			ID: row.ID, Slug: row.Slug, Label: row.Label, Description: row.Description, Comment: row.Comment,
			SkillID: row.SkillID, SkillSlug: row.SkillSlug, Parameter: row.Parameter,
			SortOrder: row.SortOrder, FoundryID: row.FoundryID, Translations: tr,
		})
	}
	return out, nil
}

func (c *Content) ListSpecializationsBySkill(ctx context.Context, skillID int64, locale model.Locale) ([]SpecializationDTO, error) {
	rows, err := c.q.ListSpecializationsBySkill(ctx, skillID)
	if err != nil {
		return nil, fmt.Errorf("list specializations by skill: %w", err)
	}
	out := make([]SpecializationDTO, 0, len(rows))
	for _, row := range rows {
		tr, err := c.translations(ctx, model.EntitySpecialization, row.ID, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, SpecializationDTO{
			ID: row.ID, Slug: row.Slug, Label: row.Label, Description: row.Description, Comment: row.Comment,
			SkillID: row.SkillID, SkillSlug: row.SkillSlug, Parameter: row.Parameter,
			SortOrder: row.SortOrder, FoundryID: row.FoundryID, Translations: tr,
		})
	}
	return out, nil
}

func (c *Content) GetSpecialization(ctx context.Context, id int64, locale model.Locale) (SpecializationDTO, error) {
	row, err := c.q.GetSpecialization(ctx, id)
	if err != nil {
		return SpecializationDTO{}, mapNotFound(err)
	}
	tr, err := c.translations(ctx, model.EntitySpecialization, row.ID, locale)
	if err != nil {
		return SpecializationDTO{}, err
	}
	return SpecializationDTO{
		ID: row.ID, Slug: row.Slug, Label: row.Label, Description: row.Description, Comment: row.Comment,
		SkillID: row.SkillID, SkillSlug: row.SkillSlug, Parameter: row.Parameter,
		SortOrder: row.SortOrder, FoundryID: row.FoundryID, Translations: tr,
	}, nil
}

type UpdateSpecializationInput struct {
	Label       string `json:"label"`
	Description string `json:"description"`
	Comment     string `json:"comment"`
	SortOrder   int64  `json:"sort_order"`
}

func (c *Content) UpdateSpecialization(ctx context.Context, id int64, in UpdateSpecializationInput, locale model.Locale) (SpecializationDTO, error) {
	if strings.TrimSpace(in.Label) == "" {
		return SpecializationDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	_, err := c.q.UpdateSpecialization(ctx, generated.UpdateSpecializationParams{
		Label: in.Label, Description: in.Description, Comment: in.Comment, SortOrder: in.SortOrder, ID: id,
	})
	if err != nil {
		return SpecializationDTO{}, mapNotFound(err)
	}
	return c.GetSpecialization(ctx, id, locale)
}

func (c *Content) ListClasses(ctx context.Context, locale model.Locale) ([]ClassDTO, error) {
	rows, err := c.q.ListClasses(ctx)
	if err != nil {
		return nil, fmt.Errorf("list classes: %w", err)
	}
	out := make([]ClassDTO, 0, len(rows))
	for _, row := range rows {
		tr, err := c.translations(ctx, model.EntityClass, row.ID, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, ClassDTO{
			ID: row.ID, Slug: row.Slug, Label: row.Label, Description: row.Description, Comment: row.Comment,
			IsFull: row.IsFull, IsPartial: row.IsPartial,
			SortOrder: row.SortOrder, FoundryID: row.FoundryID, Translations: tr,
		})
	}
	return out, nil
}

func (c *Content) GetClass(ctx context.Context, id int64, locale model.Locale) (ClassDTO, error) {
	row, err := c.q.GetClass(ctx, id)
	if err != nil {
		return ClassDTO{}, mapNotFound(err)
	}
	tr, err := c.translations(ctx, model.EntityClass, row.ID, locale)
	if err != nil {
		return ClassDTO{}, err
	}
	return ClassDTO{
		ID: row.ID, Slug: row.Slug, Label: row.Label, Description: row.Description, Comment: row.Comment,
		IsFull: row.IsFull, IsPartial: row.IsPartial,
		SortOrder: row.SortOrder, FoundryID: row.FoundryID, Translations: tr,
	}, nil
}

type UpdateClassInput struct {
	Label       string `json:"label"`
	Description string `json:"description"`
	Comment     string `json:"comment"`
	SortOrder   int64  `json:"sort_order"`
}

func (c *Content) UpdateClass(ctx context.Context, id int64, in UpdateClassInput, locale model.Locale) (ClassDTO, error) {
	if strings.TrimSpace(in.Label) == "" {
		return ClassDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	_, err := c.q.UpdateClass(ctx, generated.UpdateClassParams{
		Label: in.Label, Description: in.Description, Comment: in.Comment, SortOrder: in.SortOrder, ID: id,
	})
	if err != nil {
		return ClassDTO{}, mapNotFound(err)
	}
	return c.GetClass(ctx, id, locale)
}

type UpsertTranslationInput struct {
	EntityKind model.EntityKind       `json:"entity_kind"`
	EntityID   int64                  `json:"entity_id"`
	Locale     model.Locale           `json:"locale"`
	Field      model.TranslationField `json:"field"`
	Value      string                 `json:"value"`
}

func (c *Content) UpsertTranslation(ctx context.Context, in UpsertTranslationInput) error {
	if in.Locale == "" || in.Locale == "en" {
		return fmt.Errorf("%w: locale must be a non-English overlay", ErrInvalid)
	}
	value := strings.TrimSpace(in.Value)
	if value == "" {
		return fmt.Errorf("%w: value must not be empty; delete the overlay instead", ErrInvalid)
	}
	if !validKind(in.EntityKind) || !validField(in.Field) {
		return fmt.Errorf("%w: unknown kind or field", ErrInvalid)
	}
	_, err := c.q.UpsertTranslation(ctx, generated.UpsertTranslationParams{
		EntityKind: string(in.EntityKind),
		EntityID:   in.EntityID,
		Locale:     string(in.Locale),
		Field:      string(in.Field),
		Value:      value,
	})
	if err != nil {
		return fmt.Errorf("upsert translation: %w", err)
	}
	return nil
}

type DeleteTranslationInput struct {
	EntityKind model.EntityKind       `json:"entity_kind"`
	EntityID   int64                  `json:"entity_id"`
	Locale     model.Locale           `json:"locale"`
	Field      model.TranslationField `json:"field"`
}

func (c *Content) DeleteTranslation(ctx context.Context, in DeleteTranslationInput) error {
	if in.Locale == "" || in.Locale == "en" {
		return fmt.Errorf("%w: locale must be a non-English overlay", ErrInvalid)
	}
	if err := c.q.DeleteTranslation(ctx, generated.DeleteTranslationParams{
		EntityKind: string(in.EntityKind),
		EntityID:   in.EntityID,
		Locale:     string(in.Locale),
		Field:      string(in.Field),
	}); err != nil {
		return fmt.Errorf("delete translation: %w", err)
	}
	return nil
}

func (c *Content) Completeness(ctx context.Context, locale model.Locale) ([]CompletenessItem, error) {
	if locale == "" {
		locale = model.LocaleRU
	}
	var items []CompletenessItem

	attrs, err := c.q.ListAttributes(ctx)
	if err != nil {
		return nil, err
	}
	for _, a := range attrs {
		tr, err := c.translations(ctx, model.EntityAttribute, a.ID, locale)
		if err != nil {
			return nil, err
		}
		missing := missingFields([]model.TranslationField{
			model.FieldLabel, model.FieldAbbreviation, model.FieldDescription,
		}, tr, a.Description == "")
		if len(missing) > 0 {
			items = append(items, CompletenessItem{
				EntityKind: string(model.EntityAttribute), EntityID: a.ID,
				Slug: a.Slug, Label: a.Label, Missing: missing,
			})
		}
	}

	skills, err := c.q.ListSkills(ctx)
	if err != nil {
		return nil, err
	}
	for _, s := range skills {
		tr, err := c.translations(ctx, model.EntitySkill, s.ID, locale)
		if err != nil {
			return nil, err
		}
		missing := missingFields([]model.TranslationField{
			model.FieldLabel, model.FieldDescription,
		}, tr, s.Description == "")
		if len(missing) > 0 {
			items = append(items, CompletenessItem{
				EntityKind: string(model.EntitySkill), EntityID: s.ID,
				Slug: s.Slug, Label: s.Label, Missing: missing,
			})
		}
	}

	specs, err := c.q.ListSpecializations(ctx)
	if err != nil {
		return nil, err
	}
	for _, sp := range specs {
		tr, err := c.translations(ctx, model.EntitySpecialization, sp.ID, locale)
		if err != nil {
			return nil, err
		}
		missing := missingFields([]model.TranslationField{
			model.FieldLabel, model.FieldDescription,
		}, tr, sp.Description == "")
		if len(missing) > 0 {
			items = append(items, CompletenessItem{
				EntityKind: string(model.EntitySpecialization), EntityID: sp.ID,
				Slug: sp.Slug, Label: sp.Label, Missing: missing,
			})
		}
	}

	classes, err := c.q.ListClasses(ctx)
	if err != nil {
		return nil, err
	}
	for _, cl := range classes {
		tr, err := c.translations(ctx, model.EntityClass, cl.ID, locale)
		if err != nil {
			return nil, err
		}
		missing := missingFields([]model.TranslationField{
			model.FieldLabel, model.FieldDescription,
		}, tr, cl.Description == "")
		if len(missing) > 0 {
			items = append(items, CompletenessItem{
				EntityKind: string(model.EntityClass), EntityID: cl.ID,
				Slug: cl.Slug, Label: cl.Label, Missing: missing,
			})
		}
	}

	return items, nil
}

func missingFields(want []model.TranslationField, have TranslationMap, skipEmptyENDescription bool) []string {
	var out []string
	for _, f := range want {
		if f == model.FieldDescription && skipEmptyENDescription {
			// English description is still blank; do not nag for Russian yet.
			continue
		}
		if _, ok := have[f]; !ok {
			out = append(out, string(f))
		}
	}
	return out
}

func (c *Content) translations(ctx context.Context, kind model.EntityKind, id int64, locale model.Locale) (TranslationMap, error) {
	if locale == "" {
		locale = model.LocaleRU
	}
	rows, err := c.q.ListTranslationsForEntity(ctx, generated.ListTranslationsForEntityParams{
		EntityKind: string(kind),
		EntityID:   id,
		Locale:     string(locale),
	})
	if err != nil {
		return nil, fmt.Errorf("list translations: %w", err)
	}
	out := TranslationMap{}
	for _, row := range rows {
		out[model.TranslationField(row.Field)] = row.Value
	}
	return out, nil
}

func mapNotFound(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func validKind(k model.EntityKind) bool {
	switch k {
	case model.EntityAttribute, model.EntitySkill, model.EntitySpecialization, model.EntityClass:
		return true
	default:
		return false
	}
}

func validField(f model.TranslationField) bool {
	switch f {
	case model.FieldLabel, model.FieldAbbreviation, model.FieldDescription:
		return true
	default:
		return false
	}
}
