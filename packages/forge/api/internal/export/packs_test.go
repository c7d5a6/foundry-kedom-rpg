package export

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWritePacksTalentEffects(t *testing.T) {
	dir := t.TempDir()
	effects := `[
		{"foundryId":"aaaaaaaaaaaaaaaa","name":"Edge","img":"icons/svg/aura.svg","disabled":false,"changes":[
			{"key":"system.skills.stab.attackMod","mode":"add","value":"max(@skills.stab.proficiencyBonus, 0)","priority":20},
			{"key":"system.combat.meleeDamageBonus","mode":"add","value":"1","priority":20}
		]},
		{"foundryId":"bbbbbbbbbbbbbbbb","name":"Other","img":"","disabled":false,"changes":[
			{"key":"system.skills.heal.defaultAdvantage","mode":"add","value":"1","priority":20}
		]}
	]`
	err := WritePacks(dir, PackInput{
		Talents: []PackTalent{{
			Slug:        "two-effects",
			Label:       "Two Effects",
			Description: "",
			FoundryID:   "cccccccccccccc01",
			Category:    "class",
			FeatureKey:  "",
			GrantsJSON:  `{"skills":[],"specializations":[],"abilities":[]}`,
			EffectsJSON: effects,
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	body, err := os.ReadFile(filepath.Join(dir, "talents", "two-effects.yml"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(body)
	for _, want := range []string{
		"system.skills.stab.attackMod",
		"system.combat.meleeDamageBonus",
		"system.skills.heal.defaultAdvantage",
		"aaaaaaaaaaaaaaaa",
		"bbbbbbbbbbbbbbbb",
		"!items.effects!cccccccccccccc01.aaaaaaaaaaaaaaaa",
		"!items.effects!cccccccccccccc01.bbbbbbbbbbbbbbbb",
		"max(@skills.stab.proficiencyBonus, 0)",
		"transfer: true",
		"type: add",
	} {
		if !strings.Contains(text, want) {
			t.Fatalf("yaml missing %q:\n%s", want, text)
		}
	}
	if strings.Contains(text, "mode: add") {
		t.Fatalf("yaml still uses deprecated mode field:\n%s", text)
	}
}

func TestWritePacksRegionBannerImg(t *testing.T) {
	dir := t.TempDir()
	err := WritePacks(dir, PackInput{
		Regions: []PackRegion{{
			Slug:        "nerland",
			Label:       "Nerland",
			Description: "",
			FoundryID:   "eeeeeeeeeeeeee01",
			BannerImg:   "systems/kedom/assets/ui/nerland.webp",
			Cultures:    []PackRegionCulture{},
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	body, err := os.ReadFile(filepath.Join(dir, "origins", "region.nerland.yml"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(body)
	if !strings.Contains(text, "bannerImg: systems/kedom/assets/ui/nerland.webp") {
		t.Fatalf("yaml missing bannerImg:\n%s", text)
	}
}

func TestWritePacksOmitsEmptyEffects(t *testing.T) {
	dir := t.TempDir()
	err := WritePacks(dir, PackInput{
		Talents: []PackTalent{{
			Slug:        "plain",
			Label:       "Plain",
			FoundryID:   "dddddddddddddd01",
			Category:    "general",
			GrantsJSON:  `{"skills":[],"specializations":[],"abilities":[]}`,
			EffectsJSON: "[]",
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	body, err := os.ReadFile(filepath.Join(dir, "talents", "plain.yml"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(body), "effects:") {
		t.Fatalf("empty effects should be omitted:\n%s", body)
	}
}
