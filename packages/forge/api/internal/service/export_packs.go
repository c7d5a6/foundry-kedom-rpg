package service

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/export"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
)

// ExportPacks writes origins + talents YAML under packages/system/packs/_source/.
// Invokes lang export first so closed UI labels stay aligned with pack English.
func (c *Content) ExportPacks(ctx context.Context, packsSourceDir, langDir string) error {
	if langDir != "" {
		if err := c.ExportLang(ctx, langDir); err != nil {
			return fmt.Errorf("export lang before packs: %w", err)
		}
	}

	in, err := c.packInput(ctx)
	if err != nil {
		return err
	}
	if err := export.WritePacks(packsSourceDir, in); err != nil {
		return err
	}
	return nil
}

func (c *Content) packInput(ctx context.Context) (export.PackInput, error) {
	locale := model.Locale("en")

	talents, err := c.ListTalents(ctx, locale)
	if err != nil {
		return export.PackInput{}, err
	}
	regions, err := c.ListRegions(ctx, locale)
	if err != nil {
		return export.PackInput{}, err
	}
	races, err := c.ListRaces(ctx, locale)
	if err != nil {
		return export.PackInput{}, err
	}
	backgrounds, err := c.ListBackgrounds(ctx, locale)
	if err != nil {
		return export.PackInput{}, err
	}
	classes, err := c.ListClasses(ctx, locale)
	if err != nil {
		return export.PackInput{}, err
	}

	out := export.PackInput{
		Talents:     make([]export.PackTalent, 0, len(talents)),
		Regions:     make([]export.PackRegion, 0, len(regions)),
		Races:       make([]export.PackRace, 0, len(races)),
		Backgrounds: make([]export.PackBackground, 0, len(backgrounds)),
		Classes:     make([]export.PackClass, 0, len(classes)),
	}

	for _, t := range talents {
		out.Talents = append(out.Talents, export.PackTalent{
			Slug: t.Slug, Label: t.Label, Description: t.Description,
			FoundryID: t.FoundryID, Category: t.Category, FeatureKey: t.FeatureKey,
			GrantsJSON: t.GrantsJSON,
		})
	}

	for _, r := range regions {
		cultures := make([]export.PackRegionCulture, 0, len(r.Cultures))
		bgsByRace := map[int64][]string{}
		for _, b := range r.Backgrounds {
			bgsByRace[b.RaceID] = append(bgsByRace[b.RaceID], b.BackgroundSlug)
		}
		for _, cu := range r.Cultures {
			slugs := bgsByRace[cu.RaceID]
			if slugs == nil {
				slugs = []string{}
			}
			cultures = append(cultures, export.PackRegionCulture{
				Slug: cu.RaceSlug, Weight: cu.Weight, BackgroundSlugs: slugs,
			})
		}
		out.Regions = append(out.Regions, export.PackRegion{
			Slug: r.Slug, Label: r.Label, Description: r.Description,
			FoundryID: r.FoundryID, Cultures: cultures,
		})
	}

	for _, r := range races {
		classSlugs := make([]string, 0, len(r.Classes))
		for _, cl := range r.Classes {
			classSlugs = append(classSlugs, cl.ClassSlug)
		}
		out.Races = append(out.Races, export.PackRace{
			Slug: r.Slug, Label: r.Label, Description: r.Description,
			FoundryID: r.FoundryID, TalentSlug: r.TalentSlug, ClassSlugs: classSlugs,
		})
	}

	for _, b := range backgrounds {
		var growth [8]export.PackGrowth
		for _, g := range b.Growth {
			idx := int(g.RollIndex) - 1
			if idx < 0 || idx > 7 {
				continue
			}
			growth[idx] = export.PackGrowth{
				SkillKey: PackSkillKey(g.GrantKind, g.SkillSlug),
				SpecSlug: EffectiveSpecSlug(g.SpecializationSlug, g.SpecializationLabel),
			}
		}
		out.Backgrounds = append(out.Backgrounds, export.PackBackground{
			Slug: b.Slug, Label: b.Label, Description: b.Description,
			FoundryID: b.FoundryID,
			FreeSkillKey: PackSkillKey(b.FreeGrantKind, b.FreeSkillSlug),
			FreeSpecSlug: EffectiveSpecSlug(b.FreeSpecializationSlug, b.FreeSpecializationLabel),
			Growth:       growth,
		})
	}

	for _, cl := range classes {
		keys := []string{}
		_ = json.Unmarshal([]byte(cl.ClassTalentKeys), &keys)
		if keys == nil {
			keys = []string{}
		}
		hitDie := cl.HitDie
		if hitDie == "" {
			hitDie = "1d6"
		}
		out.Classes = append(out.Classes, export.PackClass{
			Slug: cl.Slug, Label: cl.Label, Description: cl.Description,
			FoundryID: cl.FoundryID, IsFull: cl.IsFull, HitDie: hitDie,
			HitDiePriority: cl.HitDiePriority, TalentSlug: cl.TalentSlug,
			TalentPicksWarrior: cl.TalentPicksWarrior, TalentPicksExpert: cl.TalentPicksExpert,
			TalentPicksAny: cl.TalentPicksAny,
			SavePrimary: cl.SavePrimary, SavePrimaryPriority: cl.SavePrimaryPriority,
			SaveSecondary: cl.SaveSecondary, SaveSecondaryPriority: cl.SaveSecondaryPriority,
			ArtsSkillKey: cl.ArtsSkillKey, ClassTalentKeys: keys,
		})
	}

	return out, nil
}

// DefaultPacksSourceDir returns packages/system/packs/_source under repoRoot.
func DefaultPacksSourceDir(repoRoot string) string {
	return filepath.Join(repoRoot, "packages", "system", "packs", "_source")
}
