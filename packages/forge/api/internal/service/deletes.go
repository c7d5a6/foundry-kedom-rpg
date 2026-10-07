package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/repository/generated"
)

func formatRefs(label string, slugs []string) string {
	if len(slugs) == 0 {
		return ""
	}
	return fmt.Sprintf("%s: %s", label, strings.Join(slugs, ", "))
}

func conflictBlocked(parts ...string) error {
	var nonempty []string
	for _, p := range parts {
		if p != "" {
			nonempty = append(nonempty, p)
		}
	}
	return fmt.Errorf("%w: cannot delete — still referenced by %s. Unlink those first.",
		ErrConflict, strings.Join(nonempty, "; "))
}

func (c *Content) DeleteTalent(ctx context.Context, id int64) error {
	if _, err := c.q.GetTalent(ctx, id); err != nil {
		return mapNotFound(err)
	}
	races, err := c.q.ListRacesByTalent(ctx, &id)
	if err != nil {
		return err
	}
	classes, err := c.q.ListClassesByTalent(ctx, &id)
	if err != nil {
		return err
	}
	var raceSlugs, classSlugs []string
	for _, r := range races {
		raceSlugs = append(raceSlugs, r.Slug)
	}
	for _, cl := range classes {
		classSlugs = append(classSlugs, cl.Slug)
	}
	if len(raceSlugs)+len(classSlugs) > 0 {
		return conflictBlocked(
			formatRefs("cultures", raceSlugs),
			formatRefs("classes", classSlugs),
		)
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if err := q.DeleteTranslationsForEntity(ctx, generated.DeleteTranslationsForEntityParams{
		EntityKind: string(model.EntityTalent), EntityID: id,
	}); err != nil {
		return err
	}
	if err := q.DeleteTalent(ctx, id); err != nil {
		return fmt.Errorf("delete talent: %w", err)
	}
	return tx.Commit()
}

func (c *Content) DeleteRace(ctx context.Context, id int64) error {
	if _, err := c.q.GetRace(ctx, id); err != nil {
		return mapNotFound(err)
	}
	children, err := c.q.ListChildRaces(ctx, &id)
	if err != nil {
		return err
	}
	regions, err := c.q.ListRegionCulturesByRace(ctx, id)
	if err != nil {
		return err
	}
	var childSlugs, regionSlugs []string
	for _, ch := range children {
		childSlugs = append(childSlugs, ch.Slug)
	}
	for _, r := range regions {
		regionSlugs = append(regionSlugs, r.RegionSlug)
	}
	if len(childSlugs)+len(regionSlugs) > 0 {
		return conflictBlocked(
			formatRefs("child cultures", childSlugs),
			formatRefs("regions", regionSlugs),
		)
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if err := q.DeleteRaceClasses(ctx, id); err != nil {
		return err
	}
	if err := q.DeleteTranslationsForEntity(ctx, generated.DeleteTranslationsForEntityParams{
		EntityKind: string(model.EntityRace), EntityID: id,
	}); err != nil {
		return err
	}
	if err := q.DeleteRace(ctx, id); err != nil {
		return fmt.Errorf("delete race: %w", err)
	}
	return tx.Commit()
}

func (c *Content) DeleteRegion(ctx context.Context, id int64) error {
	if _, err := c.q.GetRegion(ctx, id); err != nil {
		return mapNotFound(err)
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if err := q.DeleteRegionCultureBackgrounds(ctx, id); err != nil {
		return err
	}
	if err := q.DeleteRegionCultures(ctx, id); err != nil {
		return err
	}
	if err := q.DeleteTranslationsForEntity(ctx, generated.DeleteTranslationsForEntityParams{
		EntityKind: string(model.EntityRegion), EntityID: id,
	}); err != nil {
		return err
	}
	if err := q.DeleteRegion(ctx, id); err != nil {
		return fmt.Errorf("delete region: %w", err)
	}
	return tx.Commit()
}

func (c *Content) DeleteBackground(ctx context.Context, id int64) error {
	if _, err := c.q.GetBackground(ctx, id); err != nil {
		return mapNotFound(err)
	}
	used, err := c.q.ListRegionCultureBackgroundsByBackground(ctx, id)
	if err != nil {
		return err
	}
	if len(used) > 0 {
		refs := make([]string, 0, len(used))
		for _, u := range used {
			refs = append(refs, u.RegionSlug+"/"+u.RaceSlug)
		}
		return conflictBlocked(formatRefs("region×culture assignments", refs))
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if err := q.DeleteBackgroundGrowth(ctx, id); err != nil {
		return err
	}
	if err := q.DeleteTranslationsForEntity(ctx, generated.DeleteTranslationsForEntityParams{
		EntityKind: string(model.EntityBackground), EntityID: id,
	}); err != nil {
		return err
	}
	if err := q.DeleteBackground(ctx, id); err != nil {
		return fmt.Errorf("delete background: %w", err)
	}
	return tx.Commit()
}

func (c *Content) DeleteClass(ctx context.Context, id int64) error {
	if _, err := c.q.GetClass(ctx, id); err != nil {
		return mapNotFound(err)
	}
	races, err := c.q.ListRaceClassesByClass(ctx, id)
	if err != nil {
		return err
	}
	if len(races) > 0 {
		slugs := make([]string, 0, len(races))
		for _, r := range races {
			slugs = append(slugs, r.RaceSlug)
		}
		return conflictBlocked(formatRefs("cultures", slugs))
	}
	tx, q, err := c.begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if err := q.DeleteTranslationsForEntity(ctx, generated.DeleteTranslationsForEntityParams{
		EntityKind: string(model.EntityClass), EntityID: id,
	}); err != nil {
		return err
	}
	if err := q.DeleteClass(ctx, id); err != nil {
		return fmt.Errorf("delete class: %w", err)
	}
	return tx.Commit()
}
