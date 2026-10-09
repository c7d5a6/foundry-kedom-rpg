package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/repository/generated"
)

type CreateClassInput struct {
	Label       string  `json:"label"`
	Description string  `json:"description"`
	Comment     string  `json:"comment"`
	IsFull      *bool   `json:"is_full"`
	IsPartial   *bool   `json:"is_partial"`
	HitDie      string  `json:"hit_die"`
	TalentIDs   []int64 `json:"talent_ids"`
	SortOrder   int64   `json:"sort_order"`
}

func (c *Content) CreateClass(ctx context.Context, in CreateClassInput, locale model.Locale) (ClassDTO, error) {
	label := strings.TrimSpace(in.Label)
	if label == "" {
		return ClassDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	isFull := true
	if in.IsFull != nil {
		isFull = *in.IsFull
	}
	isPartial := false
	if in.IsPartial != nil {
		isPartial = *in.IsPartial
	}
	// Exactly one of full / partial (XOR).
	if isFull == isPartial {
		if !isFull {
			return ClassDTO{}, fmt.Errorf("%w: class must be full or partial", ErrInvalid)
		}
		// Both true → treat as full-only.
		isPartial = false
	}
	hitDie := strings.TrimSpace(in.HitDie)
	if hitDie == "" {
		hitDie = "1d6"
	}
	slug, err := UniqueSlug(SlugFromLabel(label), func(s string) (bool, error) {
		return c.q.ClassSlugExists(ctx, s)
	})
	if err != nil {
		return ClassDTO{}, err
	}
	fid, err := NewFoundryID()
	if err != nil {
		return ClassDTO{}, err
	}

	tx, q, err := c.begin(ctx)
	if err != nil {
		return ClassDTO{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	row, err := q.InsertClass(ctx, generated.InsertClassParams{
		Slug: slug, Label: label, Description: in.Description, Comment: in.Comment,
		IsFull: isFull, IsPartial: isPartial,
		HitDie: &hitDie, HitDiePriority: 0,
		TalentPicksWarrior: 0, TalentPicksExpert: 0, TalentPicksAny: 0,
		SavePrimary: "reflex", SavePrimaryPriority: 0,
		SaveSecondary: "fortitude", SaveSecondaryPriority: 0,
		EffortSkillKey: "", EffortAbilityKey1: "", EffortAbilityKey2: "",
		ArtSlotsJson: DefaultArtSlotsJSON,
		SortOrder: in.SortOrder, FoundryID: fid,
	})
	if err != nil {
		return ClassDTO{}, fmt.Errorf("insert class: %w", err)
	}
	if err := rewriteClassTalents(ctx, q, row.ID, in.TalentIDs); err != nil {
		return ClassDTO{}, err
	}
	if err := tx.Commit(); err != nil {
		return ClassDTO{}, err
	}
	return c.GetClass(ctx, row.ID, locale)
}
