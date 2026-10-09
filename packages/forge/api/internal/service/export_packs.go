package service

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/export"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
)

// ExportPacks writes origins + talents + arts YAML under packages/system/packs/_source/.
// Invokes lang export first so closed UI labels stay aligned with pack English.
// Also writes Babele overlays under packages/system/lang/babele/ru/.
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

	if langDir != "" {
		ruArts, err := c.ListArts(ctx, model.LocaleRU)
		if err != nil {
			return err
		}
		ruBySlug := make(map[string]export.ContentEntry, len(ruArts))
		for _, a := range ruArts {
			ruBySlug[a.Slug] = contentEntry(a.Label, a.Description, a.Translations)
		}
		babeleDir := filepath.Join(langDir, "babele", "ru")
		if err := export.WriteBabeleArts(babeleDir, in.Arts, ruBySlug); err != nil {
			return fmt.Errorf("export babele arts: %w", err)
		}
	}
	return nil
}

func classEffortAbilityKeys(key1, key2 string) []string {
	out := make([]string, 0, 2)
	k1 := strings.TrimSpace(key1)
	k2 := strings.TrimSpace(key2)
	if k1 != "" {
		out = append(out, k1)
	}
	if k2 != "" && k2 != k1 {
		out = append(out, k2)
	}
	return out
}

func (c *Content) packInput(ctx context.Context) (export.PackInput, error) {
	locale := model.Locale("en")

	talents, err := c.ListTalents(ctx, locale)
	if err != nil {
		return export.PackInput{}, err
	}
	arts, err := c.ListArts(ctx, locale)
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
		Arts:        make([]export.PackArt, 0, len(arts)),
		Regions:     make([]export.PackRegion, 0, len(regions)),
		Races:       make([]export.PackRace, 0, len(races)),
		Backgrounds: make([]export.PackBackground, 0, len(backgrounds)),
		Classes:     make([]export.PackClass, 0, len(classes)),
	}

	for _, t := range talents {
		out.Talents = append(out.Talents, export.PackTalent{
			Slug: t.Slug, Label: t.Label, Description: t.Description,
			FoundryID: t.FoundryID, Category: t.Category,
			GrantsJSON: t.GrantsJSON, EffectsJSON: t.EffectsJSON,
		})
	}

	for _, a := range arts {
		out.Arts = append(out.Arts, export.PackArt{
			Slug: a.Slug, Label: a.Label, Description: a.Description,
			FoundryID: a.FoundryID, ClassSlug: a.ClassSlug,
			Commitment: a.Commitment, EffectsJSON: a.EffectsJSON,
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
			FoundryID: r.FoundryID, BannerImg: r.BannerImg, Cultures: cultures,
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
			FoundryID:    b.FoundryID,
			FreeSkillKey: PackSkillKey(b.FreeGrantKind, b.FreeSkillSlug),
			FreeSpecSlug: EffectiveSpecSlug(b.FreeSpecializationSlug, b.FreeSpecializationLabel),
			Growth:       growth,
		})
	}

	for _, cl := range classes {
		hitDie := cl.HitDie
		if hitDie == "" {
			hitDie = "1d6"
		}
		talentSlugs := cl.TalentSlugs
		if talentSlugs == nil {
			talentSlugs = []string{}
		}
		slots := cl.ArtSlots
		if slots == nil {
			slots = ParseArtSlots("")
		}
		out.Classes = append(out.Classes, export.PackClass{
			Slug: cl.Slug, Label: cl.Label, Description: cl.Description,
			FoundryID: cl.FoundryID, IsFull: cl.IsFull, HitDie: hitDie,
			HitDiePriority: cl.HitDiePriority, TalentSlugs: talentSlugs,
			TalentPicksWarrior: cl.TalentPicksWarrior, TalentPicksExpert: cl.TalentPicksExpert,
			TalentPicksAny: cl.TalentPicksAny,
			SavePrimary:    cl.SavePrimary, SavePrimaryPriority: cl.SavePrimaryPriority,
			SaveSecondary: cl.SaveSecondary, SaveSecondaryPriority: cl.SaveSecondaryPriority,
			EffortSkillKey:    cl.EffortSkillKey,
			EffortAbilityKeys: classEffortAbilityKeys(cl.EffortAbilityKey1, cl.EffortAbilityKey2),
			SlotsByLevel:      slots,
		})
	}

	return out, nil
}

// DefaultPacksSourceDir returns packages/system/packs/_source under repoRoot.
func DefaultPacksSourceDir(repoRoot string) string {
	return filepath.Join(repoRoot, "packages", "system", "packs", "_source")
}
