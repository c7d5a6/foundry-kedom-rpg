package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/repository/generated"
)

func (c *Content) begin(ctx context.Context) (*sql.Tx, *generated.Queries, error) {
	tx, err := c.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("begin tx: %w", err)
	}
	return tx, c.q.WithTx(tx), nil
}

func ptrStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func ptrInt64(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}

const (
	grantKindSkill     = "skill"
	grantKindAnyCombat = "anyCombat"
	grantKindAnySkill  = "anySkill"
)

func isWildcardGrantKind(kind string) bool {
	return kind == grantKindAnyCombat || kind == grantKindAnySkill
}

func normalizeGrantKind(kind string) (string, error) {
	k := strings.TrimSpace(kind)
	if k == "" {
		k = grantKindSkill
	}
	switch k {
	case grantKindSkill, grantKindAnyCombat, grantKindAnySkill:
		return k, nil
	default:
		return "", fmt.Errorf("%w: invalid grant_kind %q", ErrInvalid, kind)
	}
}

// TalentCategory values stored in SQLite / exported to Foundry.
var talentCategories = map[string]struct{}{
	"class": {}, "culture": {}, "skills": {}, "combat": {}, "general": {}, "other": {},
}

// EntityRef is a lightweight link to another authored entity.
type EntityRef struct {
	ID    int64  `json:"id"`
	Slug  string `json:"slug"`
	Label string `json:"label"`
}

// --- Talent ---

type TalentDTO struct {
	ID             int64          `json:"id"`
	Slug           string         `json:"slug"`
	Label          string         `json:"label"`
	Description    string         `json:"description"`
	Comment        string         `json:"comment"`
	Category       string         `json:"category"`
	FeatureKey     string         `json:"feature_key"`
	GrantsJSON     string         `json:"grants_json"`
	EffectsJSON    string         `json:"effects_json"`
	SortOrder      int64          `json:"sort_order"`
	FoundryID      string         `json:"foundry_id"`
	LinkedCultures []EntityRef    `json:"linked_cultures"`
	LinkedClasses  []EntityRef    `json:"linked_classes"`
	Translations   TranslationMap `json:"translations"`
}

func (c *Content) talentDTO(ctx context.Context, row generated.Talent, tr TranslationMap) (TalentDTO, error) {
	cultures, err := c.q.ListRacesByTalent(ctx, &row.ID)
	if err != nil {
		return TalentDTO{}, err
	}
	classes, err := c.q.ListClassesByTalent(ctx, &row.ID)
	if err != nil {
		return TalentDTO{}, err
	}
	lc := make([]EntityRef, 0, len(cultures))
	for _, r := range cultures {
		lc = append(lc, EntityRef{ID: r.ID, Slug: r.Slug, Label: r.Label})
	}
	lcl := make([]EntityRef, 0, len(classes))
	for _, cl := range classes {
		lcl = append(lcl, EntityRef{ID: cl.ID, Slug: cl.Slug, Label: cl.Label})
	}
	return TalentDTO{
		ID: row.ID, Slug: row.Slug, Label: row.Label, Description: row.Description,
		Comment: row.Comment, Category: row.Category, FeatureKey: row.FeatureKey,
		GrantsJSON: row.GrantsJson, EffectsJSON: row.EffectsJson,
		SortOrder: row.SortOrder, FoundryID: row.FoundryID,
		LinkedCultures: lc, LinkedClasses: lcl, Translations: tr,
	}, nil
}

func (c *Content) ListTalents(ctx context.Context, locale model.Locale) ([]TalentDTO, error) {
	rows, err := c.q.ListTalents(ctx)
	if err != nil {
		return nil, fmt.Errorf("list talents: %w", err)
	}
	out := make([]TalentDTO, 0, len(rows))
	for _, row := range rows {
		tr, err := c.translations(ctx, model.EntityTalent, row.ID, locale)
		if err != nil {
			return nil, err
		}
		dto, err := c.talentDTO(ctx, row, tr)
		if err != nil {
			return nil, err
		}
		out = append(out, dto)
	}
	return out, nil
}

func (c *Content) GetTalent(ctx context.Context, id int64, locale model.Locale) (TalentDTO, error) {
	row, err := c.q.GetTalent(ctx, id)
	if err != nil {
		return TalentDTO{}, mapNotFound(err)
	}
	tr, err := c.translations(ctx, model.EntityTalent, row.ID, locale)
	if err != nil {
		return TalentDTO{}, err
	}
	return c.talentDTO(ctx, row, tr)
}

type CreateTalentInput struct {
	Label       string `json:"label"`
	Description string `json:"description"`
	Comment     string `json:"comment"`
	Category    string `json:"category"`
	FeatureKey  string `json:"feature_key"`
	GrantsJSON  string `json:"grants_json"`
	EffectsJSON string `json:"effects_json"`
	SortOrder   int64  `json:"sort_order"`
}

func (c *Content) CreateTalent(ctx context.Context, in CreateTalentInput, locale model.Locale) (TalentDTO, error) {
	label := strings.TrimSpace(in.Label)
	if label == "" {
		return TalentDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	cat := in.Category
	if cat == "" {
		cat = "general"
	}
	if _, ok := talentCategories[cat]; !ok {
		return TalentDTO{}, fmt.Errorf("%w: invalid category %q", ErrInvalid, cat)
	}
	grants := in.GrantsJSON
	if grants == "" {
		grants = `{"skills":[],"specializations":[],"abilities":[]}`
	}
	if !json.Valid([]byte(grants)) {
		return TalentDTO{}, fmt.Errorf("%w: grants_json must be valid JSON", ErrInvalid)
	}
	effects, err := NormalizeTalentEffects(in.EffectsJSON, NewFoundryID)
	if err != nil {
		return TalentDTO{}, err
	}
	slug, err := UniqueSlug(SlugFromLabel(label), func(s string) (bool, error) {
		return c.q.TalentSlugExists(ctx, s)
	})
	if err != nil {
		return TalentDTO{}, err
	}
	fid, err := NewFoundryID()
	if err != nil {
		return TalentDTO{}, err
	}
	row, err := c.q.InsertTalent(ctx, generated.InsertTalentParams{
		Slug: slug, Label: label, Description: in.Description, Comment: in.Comment,
		Category: cat, FeatureKey: in.FeatureKey, GrantsJson: grants, EffectsJson: effects,
		SortOrder: in.SortOrder, FoundryID: fid,
	})
	if err != nil {
		return TalentDTO{}, fmt.Errorf("insert talent: %w", err)
	}
	return c.GetTalent(ctx, row.ID, locale)
}

type UpdateTalentInput struct {
	Label       string `json:"label"`
	Description string `json:"description"`
	Comment     string `json:"comment"`
	Category    string `json:"category"`
	FeatureKey  string `json:"feature_key"`
	GrantsJSON  string `json:"grants_json"`
	EffectsJSON string `json:"effects_json"`
	SortOrder   int64  `json:"sort_order"`
}

func (c *Content) UpdateTalent(ctx context.Context, id int64, in UpdateTalentInput, locale model.Locale) (TalentDTO, error) {
	if strings.TrimSpace(in.Label) == "" {
		return TalentDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	grants := in.GrantsJSON
	if grants == "" {
		grants = `{"skills":[],"specializations":[],"abilities":[]}`
	}
	if !json.Valid([]byte(grants)) {
		return TalentDTO{}, fmt.Errorf("%w: grants_json must be valid JSON", ErrInvalid)
	}
	cat := in.Category
	if cat == "" {
		cat = "general"
	}
	if _, ok := talentCategories[cat]; !ok {
		return TalentDTO{}, fmt.Errorf("%w: invalid category %q", ErrInvalid, cat)
	}
	effects, err := NormalizeTalentEffects(in.EffectsJSON, NewFoundryID)
	if err != nil {
		return TalentDTO{}, err
	}
	_, err = c.q.UpdateTalent(ctx, generated.UpdateTalentParams{
		Label: in.Label, Description: in.Description, Comment: in.Comment,
		Category: cat, FeatureKey: in.FeatureKey, GrantsJson: grants, EffectsJson: effects,
		SortOrder: in.SortOrder, ID: id,
	})
	if err != nil {
		return TalentDTO{}, mapNotFound(err)
	}
	return c.GetTalent(ctx, id, locale)
}

// --- Race (culture) ---

type RaceClassLink struct {
	ClassID         int64  `json:"class_id"`
	ClassSlug       string `json:"class_slug"`
	ClassLabel      string `json:"class_label"`
	IsPrefilledSlot bool   `json:"is_prefilled_slot"`
}

type RaceRegionLink struct {
	RegionID    int64  `json:"region_id"`
	RegionSlug  string `json:"region_slug"`
	RegionLabel string `json:"region_label"`
	Weight      int64  `json:"weight"`
}

type RaceBackgroundUse struct {
	RegionID        int64  `json:"region_id"`
	RegionSlug      string `json:"region_slug"`
	RegionLabel     string `json:"region_label"`
	BackgroundID    int64  `json:"background_id"`
	BackgroundSlug  string `json:"background_slug"`
	BackgroundLabel string `json:"background_label"`
	SortOrder       int64  `json:"sort_order"`
}

type RaceDTO struct {
	ID                int64               `json:"id"`
	Slug              string              `json:"slug"`
	Label             string              `json:"label"`
	Description       string              `json:"description"`
	Comment           string              `json:"comment"`
	ParentRaceID      *int64              `json:"parent_race_id"`
	TalentID          *int64              `json:"talent_id"`
	TalentSlug        string              `json:"talent_slug"`
	SortOrder         int64               `json:"sort_order"`
	FoundryID         string              `json:"foundry_id"`
	Classes           []RaceClassLink     `json:"classes"`
	LinkedRegions     []RaceRegionLink    `json:"linked_regions"`
	LinkedBackgrounds []RaceBackgroundUse `json:"linked_backgrounds"`
	Translations      TranslationMap      `json:"translations"`
}

func (c *Content) ListRaces(ctx context.Context, locale model.Locale) ([]RaceDTO, error) {
	rows, err := c.q.ListRaces(ctx)
	if err != nil {
		return nil, fmt.Errorf("list races: %w", err)
	}
	out := make([]RaceDTO, 0, len(rows))
	for _, row := range rows {
		dto, err := c.raceDTO(ctx, row.ID, row.Slug, row.Label, row.Description, row.Comment,
			row.ParentRaceID, row.TalentID, ptrStr(row.TalentSlug), row.SortOrder, row.FoundryID, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, dto)
	}
	return out, nil
}

func (c *Content) GetRace(ctx context.Context, id int64, locale model.Locale) (RaceDTO, error) {
	row, err := c.q.GetRace(ctx, id)
	if err != nil {
		return RaceDTO{}, mapNotFound(err)
	}
	return c.raceDTO(ctx, row.ID, row.Slug, row.Label, row.Description, row.Comment,
		row.ParentRaceID, row.TalentID, ptrStr(row.TalentSlug), row.SortOrder, row.FoundryID, locale)
}

func (c *Content) raceDTO(
	ctx context.Context, id int64, slug, label, description, comment string,
	parentID, talentID *int64, talentSlug string, sortOrder int64, foundryID string, locale model.Locale,
) (RaceDTO, error) {
	tr, err := c.translations(ctx, model.EntityRace, id, locale)
	if err != nil {
		return RaceDTO{}, err
	}
	links, err := c.q.ListRaceClasses(ctx, id)
	if err != nil {
		return RaceDTO{}, fmt.Errorf("list race classes: %w", err)
	}
	classes := make([]RaceClassLink, 0, len(links))
	for _, l := range links {
		classes = append(classes, RaceClassLink{
			ClassID: l.ClassID, ClassSlug: l.ClassSlug, ClassLabel: l.ClassLabel,
			IsPrefilledSlot: l.IsPrefilledSlot,
		})
	}
	regs, err := c.q.ListRegionCulturesByRace(ctx, id)
	if err != nil {
		return RaceDTO{}, err
	}
	linkedRegs := make([]RaceRegionLink, 0, len(regs))
	for _, r := range regs {
		linkedRegs = append(linkedRegs, RaceRegionLink{
			RegionID: r.RegionID, RegionSlug: r.RegionSlug, RegionLabel: r.RegionLabel, Weight: r.Weight,
		})
	}
	bgs, err := c.q.ListRegionCultureBackgroundsByRace(ctx, id)
	if err != nil {
		return RaceDTO{}, err
	}
	linkedBgs := make([]RaceBackgroundUse, 0, len(bgs))
	for _, b := range bgs {
		linkedBgs = append(linkedBgs, RaceBackgroundUse{
			RegionID: b.RegionID, RegionSlug: b.RegionSlug, RegionLabel: b.RegionLabel,
			BackgroundID: b.BackgroundID, BackgroundSlug: b.BackgroundSlug,
			BackgroundLabel: b.BackgroundLabel, SortOrder: b.SortOrder,
		})
	}
	return RaceDTO{
		ID: id, Slug: slug, Label: label, Description: description, Comment: comment,
		ParentRaceID: parentID, TalentID: talentID, TalentSlug: talentSlug,
		SortOrder: sortOrder, FoundryID: foundryID, Classes: classes,
		LinkedRegions: linkedRegs, LinkedBackgrounds: linkedBgs, Translations: tr,
	}, nil
}

type CreateRaceInput struct {
	Label        string  `json:"label"`
	Description  string  `json:"description"`
	Comment      string  `json:"comment"`
	ParentRaceID *int64  `json:"parent_race_id"`
	TalentID     *int64  `json:"talent_id"`
	SortOrder    int64   `json:"sort_order"`
	ClassIDs     []int64 `json:"class_ids"`
}

func (c *Content) CreateRace(ctx context.Context, in CreateRaceInput, locale model.Locale) (RaceDTO, error) {
	label := strings.TrimSpace(in.Label)
	if label == "" {
		return RaceDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	slug, err := UniqueSlug(SlugFromLabel(label), func(s string) (bool, error) {
		return c.q.RaceSlugExists(ctx, s)
	})
	if err != nil {
		return RaceDTO{}, err
	}
	fid, err := NewFoundryID()
	if err != nil {
		return RaceDTO{}, err
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return RaceDTO{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	row, err := q.InsertRace(ctx, generated.InsertRaceParams{
		Slug: slug, Label: label, Description: in.Description, Comment: in.Comment,
		ParentRaceID: in.ParentRaceID, TalentID: in.TalentID, SortOrder: in.SortOrder, FoundryID: fid,
	})
	if err != nil {
		return RaceDTO{}, fmt.Errorf("insert race: %w", err)
	}
	for _, cid := range in.ClassIDs {
		if err := q.InsertRaceClass(ctx, generated.InsertRaceClassParams{
			RaceID: row.ID, ClassID: cid, IsPrefilledSlot: false,
		}); err != nil {
			return RaceDTO{}, fmt.Errorf("insert race class: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return RaceDTO{}, err
	}
	return c.GetRace(ctx, row.ID, locale)
}

type UpdateRaceInput struct {
	Label        string  `json:"label"`
	Description  string  `json:"description"`
	Comment      string  `json:"comment"`
	ParentRaceID *int64  `json:"parent_race_id"`
	TalentID     *int64  `json:"talent_id"`
	SortOrder    int64   `json:"sort_order"`
	ClassIDs     []int64 `json:"class_ids"`
}

func (c *Content) UpdateRace(ctx context.Context, id int64, in UpdateRaceInput, locale model.Locale) (RaceDTO, error) {
	if strings.TrimSpace(in.Label) == "" {
		return RaceDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return RaceDTO{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	_, err = q.UpdateRace(ctx, generated.UpdateRaceParams{
		Label: in.Label, Description: in.Description, Comment: in.Comment,
		ParentRaceID: in.ParentRaceID, TalentID: in.TalentID, SortOrder: in.SortOrder, ID: id,
	})
	if err != nil {
		return RaceDTO{}, mapNotFound(err)
	}
	if err := q.DeleteRaceClasses(ctx, id); err != nil {
		return RaceDTO{}, err
	}
	for _, cid := range in.ClassIDs {
		if err := q.InsertRaceClass(ctx, generated.InsertRaceClassParams{
			RaceID: id, ClassID: cid, IsPrefilledSlot: false,
		}); err != nil {
			return RaceDTO{}, fmt.Errorf("insert race class: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return RaceDTO{}, err
	}
	return c.GetRace(ctx, id, locale)
}

// --- Region ---

type RegionCultureLink struct {
	RaceID    int64  `json:"race_id"`
	RaceSlug  string `json:"race_slug"`
	RaceLabel string `json:"race_label"`
	Weight    int64  `json:"weight"`
}

type RegionBackgroundLink struct {
	RaceID          int64  `json:"race_id"`
	RaceSlug        string `json:"race_slug"`
	BackgroundID    int64  `json:"background_id"`
	BackgroundSlug  string `json:"background_slug"`
	BackgroundLabel string `json:"background_label"`
	SortOrder       int64  `json:"sort_order"`
}

type RegionDTO struct {
	ID           int64                  `json:"id"`
	Slug         string                 `json:"slug"`
	Label        string                 `json:"label"`
	Description  string                 `json:"description"`
	Comment      string                 `json:"comment"`
	SortOrder    int64                  `json:"sort_order"`
	FoundryID    string                 `json:"foundry_id"`
	BannerImg    string                 `json:"banner_img"`
	Cultures     []RegionCultureLink    `json:"cultures"`
	Backgrounds  []RegionBackgroundLink `json:"backgrounds"`
	Translations TranslationMap         `json:"translations"`
}

func (c *Content) ListRegions(ctx context.Context, locale model.Locale) ([]RegionDTO, error) {
	rows, err := c.q.ListRegions(ctx)
	if err != nil {
		return nil, fmt.Errorf("list regions: %w", err)
	}
	out := make([]RegionDTO, 0, len(rows))
	for _, row := range rows {
		dto, err := c.getRegionDTO(ctx, row.ID, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, dto)
	}
	return out, nil
}

func (c *Content) GetRegion(ctx context.Context, id int64, locale model.Locale) (RegionDTO, error) {
	return c.getRegionDTO(ctx, id, locale)
}

func (c *Content) getRegionDTO(ctx context.Context, id int64, locale model.Locale) (RegionDTO, error) {
	row, err := c.q.GetRegion(ctx, id)
	if err != nil {
		return RegionDTO{}, mapNotFound(err)
	}
	tr, err := c.translations(ctx, model.EntityRegion, id, locale)
	if err != nil {
		return RegionDTO{}, err
	}
	cultures, err := c.q.ListRegionCultures(ctx, id)
	if err != nil {
		return RegionDTO{}, err
	}
	cl := make([]RegionCultureLink, 0, len(cultures))
	for _, x := range cultures {
		cl = append(cl, RegionCultureLink{
			RaceID: x.RaceID, RaceSlug: x.RaceSlug, RaceLabel: x.RaceLabel, Weight: x.Weight,
		})
	}
	bgs, err := c.q.ListRegionCultureBackgrounds(ctx, id)
	if err != nil {
		return RegionDTO{}, err
	}
	bl := make([]RegionBackgroundLink, 0, len(bgs))
	for _, x := range bgs {
		bl = append(bl, RegionBackgroundLink{
			RaceID: x.RaceID, RaceSlug: x.RaceSlug,
			BackgroundID: x.BackgroundID, BackgroundSlug: x.BackgroundSlug,
			BackgroundLabel: x.BackgroundLabel, SortOrder: x.SortOrder,
		})
	}
	return RegionDTO{
		ID: row.ID, Slug: row.Slug, Label: row.Label, Description: row.Description,
		Comment: row.Comment, SortOrder: row.SortOrder, FoundryID: row.FoundryID,
		BannerImg: row.BannerImg,
		Cultures:  cl, Backgrounds: bl, Translations: tr,
	}, nil
}

type RegionCultureIn struct {
	RaceID int64 `json:"race_id"`
	Weight int64 `json:"weight"`
}

type RegionBackgroundIn struct {
	RaceID       int64 `json:"race_id"`
	BackgroundID int64 `json:"background_id"`
	SortOrder    int64 `json:"sort_order"`
}

type CreateRegionInput struct {
	Label       string               `json:"label"`
	Description string               `json:"description"`
	Comment     string               `json:"comment"`
	SortOrder   int64                `json:"sort_order"`
	BannerImg   string               `json:"banner_img"`
	Cultures    []RegionCultureIn    `json:"cultures"`
	Backgrounds []RegionBackgroundIn `json:"backgrounds"`
}

func (c *Content) CreateRegion(ctx context.Context, in CreateRegionInput, locale model.Locale) (RegionDTO, error) {
	label := strings.TrimSpace(in.Label)
	if label == "" {
		return RegionDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	slug, err := UniqueSlug(SlugFromLabel(label), func(s string) (bool, error) {
		return c.q.RegionSlugExists(ctx, s)
	})
	if err != nil {
		return RegionDTO{}, err
	}
	fid, err := NewFoundryID()
	if err != nil {
		return RegionDTO{}, err
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return RegionDTO{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	row, err := q.InsertRegion(ctx, generated.InsertRegionParams{
		Slug: slug, Label: label, Description: in.Description, Comment: in.Comment,
		SortOrder: in.SortOrder, FoundryID: fid, BannerImg: strings.TrimSpace(in.BannerImg),
	})
	if err != nil {
		return RegionDTO{}, fmt.Errorf("insert region: %w", err)
	}
	if err := c.writeRegionLinks(ctx, q, row.ID, in.Cultures, in.Backgrounds); err != nil {
		return RegionDTO{}, err
	}
	if err := tx.Commit(); err != nil {
		return RegionDTO{}, err
	}
	return c.GetRegion(ctx, row.ID, locale)
}

type UpdateRegionInput struct {
	Label       string               `json:"label"`
	Description string               `json:"description"`
	Comment     string               `json:"comment"`
	SortOrder   int64                `json:"sort_order"`
	BannerImg   string               `json:"banner_img"`
	Cultures    []RegionCultureIn    `json:"cultures"`
	Backgrounds []RegionBackgroundIn `json:"backgrounds"`
}

func (c *Content) UpdateRegion(ctx context.Context, id int64, in UpdateRegionInput, locale model.Locale) (RegionDTO, error) {
	if strings.TrimSpace(in.Label) == "" {
		return RegionDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return RegionDTO{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	_, err = q.UpdateRegion(ctx, generated.UpdateRegionParams{
		Label: in.Label, Description: in.Description, Comment: in.Comment,
		SortOrder: in.SortOrder, BannerImg: strings.TrimSpace(in.BannerImg), ID: id,
	})
	if err != nil {
		return RegionDTO{}, mapNotFound(err)
	}
	if err := q.DeleteRegionCultureBackgrounds(ctx, id); err != nil {
		return RegionDTO{}, err
	}
	if err := q.DeleteRegionCultures(ctx, id); err != nil {
		return RegionDTO{}, err
	}
	if err := c.writeRegionLinks(ctx, q, id, in.Cultures, in.Backgrounds); err != nil {
		return RegionDTO{}, err
	}
	if err := tx.Commit(); err != nil {
		return RegionDTO{}, err
	}
	return c.GetRegion(ctx, id, locale)
}

func (c *Content) writeRegionLinks(
	ctx context.Context, q *generated.Queries, regionID int64,
	cultures []RegionCultureIn, backgrounds []RegionBackgroundIn,
) error {
	for _, cu := range cultures {
		if cu.Weight <= 0 {
			return fmt.Errorf("%w: culture weight must be > 0", ErrInvalid)
		}
		if err := q.InsertRegionCulture(ctx, generated.InsertRegionCultureParams{
			RegionID: regionID, RaceID: cu.RaceID, Weight: cu.Weight,
		}); err != nil {
			return fmt.Errorf("insert region culture: %w", err)
		}
	}
	for _, bg := range backgrounds {
		if err := q.InsertRegionCultureBackground(ctx, generated.InsertRegionCultureBackgroundParams{
			RegionID: regionID, RaceID: bg.RaceID, BackgroundID: bg.BackgroundID, SortOrder: bg.SortOrder,
		}); err != nil {
			return fmt.Errorf("insert region culture background: %w", err)
		}
	}
	return nil
}

// --- Background ---

type GrowthRowDTO struct {
	RollIndex           int64  `json:"roll_index"`
	GrantKind           string `json:"grant_kind"`
	SkillID             *int64 `json:"skill_id"`
	SkillSlug           string `json:"skill_slug"`
	SpecializationID    *int64 `json:"specialization_id"`
	SpecializationSlug  string `json:"specialization_slug"`
	SpecializationLabel string `json:"specialization_label"`
}

type BackgroundUseLink struct {
	RegionID    int64  `json:"region_id"`
	RegionSlug  string `json:"region_slug"`
	RegionLabel string `json:"region_label"`
	RaceID      int64  `json:"race_id"`
	RaceSlug    string `json:"race_slug"`
	RaceLabel   string `json:"race_label"`
	SortOrder   int64  `json:"sort_order"`
}

type BackgroundDTO struct {
	ID                      int64               `json:"id"`
	Slug                    string              `json:"slug"`
	Label                   string              `json:"label"`
	Description             string              `json:"description"`
	Comment                 string              `json:"comment"`
	FreeGrantKind           string              `json:"free_grant_kind"`
	FreeSkillID             *int64              `json:"free_skill_id"`
	FreeSkillSlug           string              `json:"free_skill_slug"`
	FreeSpecializationID    *int64              `json:"free_specialization_id"`
	FreeSpecializationSlug  string              `json:"free_specialization_slug"`
	FreeSpecializationLabel string              `json:"free_specialization_label"`
	SortOrder               int64               `json:"sort_order"`
	FoundryID               string              `json:"foundry_id"`
	Growth                  []GrowthRowDTO      `json:"growth"`
	UsedBy                  []BackgroundUseLink `json:"used_by"`
	Translations            TranslationMap      `json:"translations"`
}

func (c *Content) ListBackgrounds(ctx context.Context, locale model.Locale) ([]BackgroundDTO, error) {
	rows, err := c.q.ListBackgrounds(ctx)
	if err != nil {
		return nil, fmt.Errorf("list backgrounds: %w", err)
	}
	out := make([]BackgroundDTO, 0, len(rows))
	for _, row := range rows {
		dto, err := c.backgroundFromListRow(ctx, row, locale)
		if err != nil {
			return nil, err
		}
		out = append(out, dto)
	}
	return out, nil
}

func (c *Content) GetBackground(ctx context.Context, id int64, locale model.Locale) (BackgroundDTO, error) {
	row, err := c.q.GetBackground(ctx, id)
	if err != nil {
		return BackgroundDTO{}, mapNotFound(err)
	}
	return c.backgroundFromGetRow(ctx, row, locale)
}

func (c *Content) backgroundFromListRow(ctx context.Context, row generated.ListBackgroundsRow, locale model.Locale) (BackgroundDTO, error) {
	return c.buildBackgroundDTO(ctx, row.ID, row.Slug, row.Label, row.Description, row.Comment,
		row.FreeGrantKind, row.FreeSkillID, ptrStr(row.FreeSkillSlug), row.FreeSpecializationID,
		ptrStr(row.FreeSpecializationSlug), row.FreeSpecializationLabel, row.SortOrder, row.FoundryID, locale)
}

func (c *Content) backgroundFromGetRow(ctx context.Context, row generated.GetBackgroundRow, locale model.Locale) (BackgroundDTO, error) {
	return c.buildBackgroundDTO(ctx, row.ID, row.Slug, row.Label, row.Description, row.Comment,
		row.FreeGrantKind, row.FreeSkillID, ptrStr(row.FreeSkillSlug), row.FreeSpecializationID,
		ptrStr(row.FreeSpecializationSlug), row.FreeSpecializationLabel, row.SortOrder, row.FoundryID, locale)
}

func (c *Content) buildBackgroundDTO(
	ctx context.Context, id int64, slug, label, description, comment string,
	freeGrantKind string, freeSkillID *int64, freeSkillSlug string, freeSpecID *int64, freeSpecSlug, freeSpecLabel string,
	sortOrder int64, foundryID string, locale model.Locale,
) (BackgroundDTO, error) {
	tr, err := c.translations(ctx, model.EntityBackground, id, locale)
	if err != nil {
		return BackgroundDTO{}, err
	}
	growth, err := c.q.ListBackgroundGrowth(ctx, id)
	if err != nil {
		return BackgroundDTO{}, err
	}
	g := make([]GrowthRowDTO, 0, len(growth))
	for _, row := range growth {
		g = append(g, GrowthRowDTO{
			RollIndex: row.RollIndex, GrantKind: row.GrantKind,
			SkillID: row.SkillID, SkillSlug: ptrStr(row.SkillSlug),
			SpecializationID: row.SpecializationID, SpecializationSlug: ptrStr(row.SpecializationSlug),
			SpecializationLabel: row.SpecializationLabel,
		})
	}
	used, err := c.q.ListRegionCultureBackgroundsByBackground(ctx, id)
	if err != nil {
		return BackgroundDTO{}, err
	}
	usedBy := make([]BackgroundUseLink, 0, len(used))
	for _, u := range used {
		usedBy = append(usedBy, BackgroundUseLink{
			RegionID: u.RegionID, RegionSlug: u.RegionSlug, RegionLabel: u.RegionLabel,
			RaceID: u.RaceID, RaceSlug: u.RaceSlug, RaceLabel: u.RaceLabel, SortOrder: u.SortOrder,
		})
	}
	return BackgroundDTO{
		ID: id, Slug: slug, Label: label, Description: description, Comment: comment,
		FreeGrantKind: freeGrantKind, FreeSkillID: freeSkillID, FreeSkillSlug: freeSkillSlug,
		FreeSpecializationID: freeSpecID, FreeSpecializationSlug: freeSpecSlug,
		FreeSpecializationLabel: freeSpecLabel,
		SortOrder:               sortOrder, FoundryID: foundryID, Growth: g, UsedBy: usedBy, Translations: tr,
	}, nil
}

type GrowthRowIn struct {
	RollIndex           int64  `json:"roll_index"`
	GrantKind           string `json:"grant_kind"`
	SkillID             *int64 `json:"skill_id"`
	SpecializationID    *int64 `json:"specialization_id"`
	SpecializationLabel string `json:"specialization_label"`
}

type CreateBackgroundInput struct {
	Label                   string        `json:"label"`
	Description             string        `json:"description"`
	Comment                 string        `json:"comment"`
	FreeGrantKind           string        `json:"free_grant_kind"`
	FreeSkillID             *int64        `json:"free_skill_id"`
	FreeSpecializationID    *int64        `json:"free_specialization_id"`
	FreeSpecializationLabel string        `json:"free_specialization_label"`
	SortOrder               int64         `json:"sort_order"`
	Growth                  []GrowthRowIn `json:"growth"`
}

func (c *Content) CreateBackground(ctx context.Context, in CreateBackgroundInput, locale model.Locale) (BackgroundDTO, error) {
	label := strings.TrimSpace(in.Label)
	if label == "" {
		return BackgroundDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	freeKind, freeSkillID, freeSpecID, freeLabel, err := normalizeGrantFields(
		in.FreeGrantKind, in.FreeSkillID, in.FreeSpecializationID, in.FreeSpecializationLabel,
	)
	if err != nil {
		return BackgroundDTO{}, err
	}
	normGrowth, err := normalizeGrowthIn(in.Growth)
	if err != nil {
		return BackgroundDTO{}, err
	}
	if err := c.validateBackgroundGrants(ctx, freeKind, freeSkillID, freeSpecID, freeLabel, normGrowth); err != nil {
		return BackgroundDTO{}, err
	}
	slug, err := UniqueSlug(SlugFromLabel(label), func(s string) (bool, error) {
		return c.q.BackgroundSlugExists(ctx, s)
	})
	if err != nil {
		return BackgroundDTO{}, err
	}
	fid, err := NewFoundryID()
	if err != nil {
		return BackgroundDTO{}, err
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return BackgroundDTO{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	row, err := q.InsertBackground(ctx, generated.InsertBackgroundParams{
		Slug: slug, Label: label, Description: in.Description, Comment: in.Comment,
		FreeGrantKind: freeKind, FreeSkillID: freeSkillID, FreeSpecializationID: freeSpecID,
		FreeSpecializationLabel: freeLabel,
		SortOrder:               in.SortOrder, FoundryID: fid,
	})
	if err != nil {
		return BackgroundDTO{}, fmt.Errorf("insert background: %w", err)
	}
	if err := writeGrowth(ctx, q, row.ID, normGrowth); err != nil {
		return BackgroundDTO{}, err
	}
	if err := tx.Commit(); err != nil {
		return BackgroundDTO{}, err
	}
	return c.GetBackground(ctx, row.ID, locale)
}

type UpdateBackgroundInput struct {
	Label                   string        `json:"label"`
	Description             string        `json:"description"`
	Comment                 string        `json:"comment"`
	FreeGrantKind           string        `json:"free_grant_kind"`
	FreeSkillID             *int64        `json:"free_skill_id"`
	FreeSpecializationID    *int64        `json:"free_specialization_id"`
	FreeSpecializationLabel string        `json:"free_specialization_label"`
	SortOrder               int64         `json:"sort_order"`
	Growth                  []GrowthRowIn `json:"growth"`
}

func (c *Content) UpdateBackground(ctx context.Context, id int64, in UpdateBackgroundInput, locale model.Locale) (BackgroundDTO, error) {
	if strings.TrimSpace(in.Label) == "" {
		return BackgroundDTO{}, fmt.Errorf("%w: label required", ErrInvalid)
	}
	freeKind, freeSkillID, freeSpecID, freeLabel, err := normalizeGrantFields(
		in.FreeGrantKind, in.FreeSkillID, in.FreeSpecializationID, in.FreeSpecializationLabel,
	)
	if err != nil {
		return BackgroundDTO{}, err
	}
	normGrowth, err := normalizeGrowthIn(in.Growth)
	if err != nil {
		return BackgroundDTO{}, err
	}
	if err := c.validateBackgroundGrants(ctx, freeKind, freeSkillID, freeSpecID, freeLabel, normGrowth); err != nil {
		return BackgroundDTO{}, err
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return BackgroundDTO{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	_, err = q.UpdateBackground(ctx, generated.UpdateBackgroundParams{
		Label: in.Label, Description: in.Description, Comment: in.Comment,
		FreeGrantKind: freeKind, FreeSkillID: freeSkillID, FreeSpecializationID: freeSpecID,
		FreeSpecializationLabel: freeLabel,
		SortOrder:               in.SortOrder, ID: id,
	})
	if err != nil {
		return BackgroundDTO{}, mapNotFound(err)
	}
	if err := q.DeleteBackgroundGrowth(ctx, id); err != nil {
		return BackgroundDTO{}, err
	}
	if err := writeGrowth(ctx, q, id, normGrowth); err != nil {
		return BackgroundDTO{}, err
	}
	if err := tx.Commit(); err != nil {
		return BackgroundDTO{}, err
	}
	return c.GetBackground(ctx, id, locale)
}

func normalizeGrantFields(
	kind string, skillID *int64, specID *int64, label string,
) (string, *int64, *int64, string, error) {
	k, err := normalizeGrantKind(kind)
	if err != nil {
		return "", nil, nil, "", err
	}
	trimmed := strings.TrimSpace(label)
	sid := skillID
	if sid != nil && *sid <= 0 {
		sid = nil
	}
	spid := specID
	if spid != nil && *spid <= 0 {
		spid = nil
	}
	if isWildcardGrantKind(k) {
		return k, nil, nil, "", nil
	}
	if sid == nil {
		return "", nil, nil, "", fmt.Errorf("%w: skill_id required for skill grants", ErrInvalid)
	}
	return k, sid, spid, trimmed, nil
}

func normalizeGrowthIn(growth []GrowthRowIn) ([]GrowthRowIn, error) {
	out := make([]GrowthRowIn, len(growth))
	for i, g := range growth {
		kind, skillID, specID, label, err := normalizeGrantFields(
			g.GrantKind, g.SkillID, g.SpecializationID, g.SpecializationLabel,
		)
		if err != nil {
			return nil, err
		}
		out[i] = GrowthRowIn{
			RollIndex:           g.RollIndex,
			GrantKind:           kind,
			SkillID:             skillID,
			SpecializationID:    specID,
			SpecializationLabel: label,
		}
	}
	return out, nil
}

func grantKey(kind string, skillID *int64, specID *int64, label string) string {
	if isWildcardGrantKind(kind) {
		// Allow multiple identical wildcards (matches draft tables).
		return fmt.Sprintf("wild:%s", kind)
	}
	spec := int64(0)
	if specID != nil {
		spec = *specID
	}
	return fmt.Sprintf("skill:%d|%d|%s", ptrInt64(skillID), spec, strings.ToLower(strings.TrimSpace(label)))
}

func (c *Content) skillMode(ctx context.Context, skillID int64) (string, error) {
	row, err := c.q.GetSkill(ctx, skillID)
	if err != nil {
		return "", fmt.Errorf("%w: unknown skill_id %d", ErrInvalid, skillID)
	}
	return row.SpecializationMode, nil
}

func (c *Content) validateSpecForMode(ctx context.Context, skillID int64, specID *int64, label string) error {
	mode, err := c.skillMode(ctx, skillID)
	if err != nil {
		return err
	}
	hasID := specID != nil && *specID > 0
	hasLabel := strings.TrimSpace(label) != ""
	if hasID && hasLabel {
		return fmt.Errorf("%w: specialization_id and specialization_label are mutually exclusive", ErrInvalid)
	}
	switch mode {
	case "none":
		if hasID || hasLabel {
			return fmt.Errorf("%w: skill mode none forbids specialization", ErrInvalid)
		}
	case "fixed":
		if hasLabel {
			return fmt.Errorf("%w: skill mode fixed forbids freeform specialization_label", ErrInvalid)
		}
		if hasID {
			if err := c.specBelongsToSkill(ctx, skillID, *specID); err != nil {
				return err
			}
		}
	case "free":
		if hasID {
			return fmt.Errorf("%w: skill mode free forbids specialization_id", ErrInvalid)
		}
	case "parameterized":
		if hasID {
			if err := c.specBelongsToSkill(ctx, skillID, *specID); err != nil {
				return err
			}
		}
	default:
		return fmt.Errorf("%w: unknown specialization_mode %q", ErrInvalid, mode)
	}
	return nil
}

func (c *Content) specBelongsToSkill(ctx context.Context, skillID, specID int64) error {
	row, err := c.q.GetSpecialization(ctx, specID)
	if err != nil {
		return fmt.Errorf("%w: unknown specialization_id %d", ErrInvalid, specID)
	}
	if row.SkillID != skillID {
		return fmt.Errorf("%w: specialization %d does not belong to skill %d", ErrInvalid, specID, skillID)
	}
	return nil
}

func (c *Content) validateBackgroundGrants(
	ctx context.Context,
	freeKind string, freeSkillID *int64, freeSpecID *int64, freeLabel string,
	growth []GrowthRowIn,
) error {
	if len(growth) != 8 {
		return fmt.Errorf("%w: growth must have exactly 8 rows", ErrInvalid)
	}
	if freeKind == grantKindSkill {
		if err := c.validateSpecForMode(ctx, *freeSkillID, freeSpecID, freeLabel); err != nil {
			return err
		}
	}
	seen := map[string]bool{}
	// Wildcards may repeat; only track concrete skill grants for uniqueness.
	if freeKind == grantKindSkill {
		seen[grantKey(freeKind, freeSkillID, freeSpecID, freeLabel)] = true
	}
	indexes := map[int64]bool{}
	for _, g := range growth {
		if g.RollIndex < 1 || g.RollIndex > 8 {
			return fmt.Errorf("%w: roll_index must be 1..8", ErrInvalid)
		}
		if indexes[g.RollIndex] {
			return fmt.Errorf("%w: duplicate roll_index %d", ErrInvalid, g.RollIndex)
		}
		indexes[g.RollIndex] = true
		if g.GrantKind == grantKindSkill {
			if err := c.validateSpecForMode(ctx, *g.SkillID, g.SpecializationID, g.SpecializationLabel); err != nil {
				return err
			}
			k := grantKey(g.GrantKind, g.SkillID, g.SpecializationID, g.SpecializationLabel)
			if seen[k] {
				return fmt.Errorf("%w: duplicate skill+specialization on background", ErrInvalid)
			}
			seen[k] = true
		}
	}
	return nil
}

func writeGrowth(ctx context.Context, q *generated.Queries, backgroundID int64, growth []GrowthRowIn) error {
	for _, g := range growth {
		if err := q.InsertBackgroundGrowth(ctx, generated.InsertBackgroundGrowthParams{
			BackgroundID: backgroundID, RollIndex: g.RollIndex, GrantKind: g.GrantKind,
			SkillID: g.SkillID, SpecializationID: g.SpecializationID,
			SpecializationLabel: g.SpecializationLabel,
		}); err != nil {
			return fmt.Errorf("insert growth: %w", err)
		}
	}
	return nil
}

// EffectiveSpecSlug for pack export: freeform English label, else catalog slug.
func EffectiveSpecSlug(catalogSlug, freeformLabel string) string {
	if strings.TrimSpace(freeformLabel) != "" {
		return strings.TrimSpace(freeformLabel)
	}
	return strings.TrimSpace(catalogSlug)
}

// PackSkillKey returns the pack skillKey for a grant (wildcard sentinel or skill slug).
func PackSkillKey(grantKind, skillSlug string) string {
	if isWildcardGrantKind(grantKind) {
		return grantKind
	}
	return skillSlug
}
