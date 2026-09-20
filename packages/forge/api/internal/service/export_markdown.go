package service

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/export"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
)

// ExportMarkdown builds a locale-aware barebones rulebook as one markdown document.
func (c *Content) ExportMarkdown(ctx context.Context, locale model.Locale) (string, error) {
	in, err := c.rulebookInput(ctx, locale)
	if err != nil {
		return "", err
	}
	var b strings.Builder
	if err := export.WriteRulebook(&b, in); err != nil {
		return "", err
	}
	return b.String(), nil
}

// ExportMarkdownDir writes rulebook.md plus section files under outDir.
func (c *Content) ExportMarkdownDir(ctx context.Context, locale model.Locale, outDir string) error {
	in, err := c.rulebookInput(ctx, locale)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return fmt.Errorf("mkdir export dir: %w", err)
	}

	writers := []struct {
		name string
		fn   func(*os.File, export.RulebookInput) error
	}{
		{"rulebook.md", func(f *os.File, in export.RulebookInput) error { return export.WriteRulebook(f, in) }},
		{"attributes.md", func(f *os.File, in export.RulebookInput) error { return export.WriteAttributesFile(f, in) }},
		{"skills.md", func(f *os.File, in export.RulebookInput) error { return export.WriteSkillsFile(f, in) }},
		{"classes.md", func(f *os.File, in export.RulebookInput) error { return export.WriteClassesFile(f, in) }},
	}

	for _, w := range writers {
		path := filepath.Join(outDir, w.name)
		f, err := os.Create(path)
		if err != nil {
			return fmt.Errorf("create %s: %w", path, err)
		}
		writeErr := w.fn(f, in)
		closeErr := f.Close()
		if writeErr != nil {
			return fmt.Errorf("write %s: %w", path, writeErr)
		}
		if closeErr != nil {
			return fmt.Errorf("close %s: %w", path, closeErr)
		}
	}
	return nil
}

func (c *Content) rulebookInput(ctx context.Context, locale model.Locale) (export.RulebookInput, error) {
	loc := string(locale)
	if loc == "" || loc == "en" {
		loc = "en"
		locale = ""
	}

	attrs, err := c.ListAttributes(ctx, effectiveOverlay(locale))
	if err != nil {
		return export.RulebookInput{}, err
	}
	skills, err := c.ListSkills(ctx, effectiveOverlay(locale))
	if err != nil {
		return export.RulebookInput{}, err
	}
	classes, err := c.ListClasses(ctx, effectiveOverlay(locale))
	if err != nil {
		return export.RulebookInput{}, err
	}

	attrLabel := make(map[string]string, len(attrs))
	outAttrs := make([]export.AttributeRow, 0, len(attrs))
	for _, a := range attrs {
		label := overlay(a.Label, a.Translations, model.FieldLabel)
		abbr := overlay(a.Abbreviation, a.Translations, model.FieldAbbreviation)
		desc := overlay(a.Description, a.Translations, model.FieldDescription)
		attrLabel[a.Slug] = label
		outAttrs = append(outAttrs, export.AttributeRow{
			Slug: a.Slug, Label: label, Abbreviation: abbr, Description: desc,
		})
	}

	outSkills := make([]export.SkillRow, 0, len(skills))
	for _, s := range skills {
		specs, err := c.ListSpecializationsBySkill(ctx, s.ID, effectiveOverlay(locale))
		if err != nil {
			return export.RulebookInput{}, err
		}
		outSpecs := make([]export.SpecRow, 0, len(specs))
		for _, sp := range specs {
			param := ""
			if sp.Parameter != nil {
				param = *sp.Parameter
			}
			outSpecs = append(outSpecs, export.SpecRow{
				Slug:        sp.Slug,
				Label:       overlay(sp.Label, sp.Translations, model.FieldLabel),
				Description: overlay(sp.Description, sp.Translations, model.FieldDescription),
				Parameter:   param,
			})
		}
		attrLbl := attrLabel[s.AttributeSlug]
		if attrLbl == "" {
			attrLbl = s.AttributeSlug
		}
		outSkills = append(outSkills, export.SkillRow{
			Slug:               s.Slug,
			Label:              overlay(s.Label, s.Translations, model.FieldLabel),
			Description:        overlay(s.Description, s.Translations, model.FieldDescription),
			AttributeSlug:      s.AttributeSlug,
			AttributeLabel:     attrLbl,
			SpecializationMode: s.SpecializationMode,
			IsSecondary:        s.IsSecondary,
			Specs:              outSpecs,
		})
	}

	outClasses := make([]export.ClassRow, 0, len(classes))
	for _, cl := range classes {
		outClasses = append(outClasses, export.ClassRow{
			Slug:        cl.Slug,
			Label:       overlay(cl.Label, cl.Translations, model.FieldLabel),
			Description: overlay(cl.Description, cl.Translations, model.FieldDescription),
			IsFull:      cl.IsFull,
			IsPartial:   cl.IsPartial,
		})
	}

	return export.RulebookInput{
		Locale:     loc,
		Attributes: outAttrs,
		Skills:     outSkills,
		Classes:    outClasses,
	}, nil
}

func effectiveOverlay(locale model.Locale) model.Locale {
	if locale == "" || locale == "en" {
		// No overlays: query a locale that has no rows so TranslationMap stays empty.
		return "en"
	}
	return locale
}

func overlay(canonical string, tr TranslationMap, field model.TranslationField) string {
	if v, ok := tr[field]; ok && strings.TrimSpace(v) != "" {
		return v
	}
	return canonical
}
