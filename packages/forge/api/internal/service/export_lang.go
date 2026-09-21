package service

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/export"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
)

// ExportLang writes closed-vocabulary sections into packages/system/lang/{en,ru}.json.
func (c *Content) ExportLang(ctx context.Context, langDir string) error {
	en, err := c.langClosed(ctx, "")
	if err != nil {
		return err
	}
	if err := export.ValidateClosedSlugs(en); err != nil {
		return err
	}
	ru, err := c.langClosed(ctx, model.LocaleRU)
	if err != nil {
		return err
	}

	enPath := filepath.Join(langDir, "en.json")
	ruPath := filepath.Join(langDir, "ru.json")
	if err := export.WriteLangFile(enPath, en); err != nil {
		return fmt.Errorf("write en.json: %w", err)
	}
	if err := export.WriteLangFile(ruPath, ru); err != nil {
		return fmt.Errorf("write ru.json: %w", err)
	}
	return nil
}

func (c *Content) langClosed(ctx context.Context, locale model.Locale) (export.LangClosedInput, error) {
	overlayLocale := effectiveOverlay(locale)

	attrs, err := c.ListAttributes(ctx, overlayLocale)
	if err != nil {
		return export.LangClosedInput{}, err
	}
	skills, err := c.ListSkills(ctx, overlayLocale)
	if err != nil {
		return export.LangClosedInput{}, err
	}
	vocab, err := c.ListVocab(ctx, overlayLocale)
	if err != nil {
		return export.LangClosedInput{}, err
	}

	out := export.LangClosedInput{
		Ability:     map[string]export.AbilityLabel{},
		Skill:       map[string]string{},
		Proficiency: map[string]string{},
		Outcome:     map[string]string{},
		Save:        map[string]string{},
		Difficulty:  map[string]string{},
		Attributes:  map[string]string{},
		Condition:   map[string]string{},
		Injury: export.InjuryLabels{
			Severity:   map[string]string{},
			Location:   map[string]string{},
			WeaponType: map[string]string{},
		},
		Specialization: map[string]map[string]string{},
	}

	for _, a := range attrs {
		out.Ability[a.Slug] = export.AbilityLabel{
			Label: overlay(a.Label, a.Translations, model.FieldLabel),
			Abbr:  overlay(a.Abbreviation, a.Translations, model.FieldAbbreviation),
		}
	}
	for _, s := range skills {
		out.Skill[s.Slug] = overlay(s.Label, s.Translations, model.FieldLabel)
	}

	for _, v := range vocab {
		label := overlay(v.Label, v.Translations, model.FieldLabel)
		switch model.EntityKind(v.Kind) {
		case model.EntityProficiency:
			out.Proficiency[v.Slug] = label
		case model.EntityOutcome:
			out.Outcome[v.Slug] = label
		case model.EntitySave:
			out.Save[v.Slug] = label
		case model.EntityDifficulty:
			out.Difficulty[v.Slug] = label
		case model.EntityDerived:
			out.Attributes[v.Slug] = label
		case model.EntityCondition:
			out.Condition[v.Slug] = label
		case model.EntityInjurySeverity:
			out.Injury.Severity[v.Slug] = label
		case model.EntityInjuryLocation:
			out.Injury.Location[v.Slug] = label
		case model.EntityInjuryWeapon:
			out.Injury.WeaponType[v.Slug] = label
		}
	}

	specs, err := c.ListSpecializations(ctx, overlayLocale)
	if err != nil {
		return export.LangClosedInput{}, err
	}
	for _, sp := range specs {
		leaf := specializationLeaf(sp.Slug, sp.SkillSlug)
		if leaf == "" {
			continue
		}
		bySkill, ok := out.Specialization[sp.SkillSlug]
		if !ok {
			bySkill = map[string]string{}
			out.Specialization[sp.SkillSlug] = bySkill
		}
		bySkill[leaf] = overlay(sp.Label, sp.Translations, model.FieldLabel)
	}

	return out, nil
}

// specializationLeaf returns the Foundry leaf key for slug `skill.leaf`.
func specializationLeaf(slug, skillSlug string) string {
	prefix := skillSlug + "."
	if strings.HasPrefix(slug, prefix) {
		return strings.TrimPrefix(slug, prefix)
	}
	if i := strings.IndexByte(slug, '.'); i >= 0 && i+1 < len(slug) {
		return slug[i+1:]
	}
	return ""
}
