package service

import (
	"strings"
	"testing"
)

func TestNormalizeTalentEffects(t *testing.T) {
	n := 0
	newID := func() (string, error) {
		n++
		return fmtID(n), nil
	}

	raw := `[
		{"name":"Killing Blow","changes":[
			{"key":"system.skills.stab.attackMod","mode":"add","value":"max(@skills.stab.proficiencyBonus, 0)"}
		]},
		{"foundryId":"bbcdefghijklmnop","name":"Other","disabled":true,"changes":[]}
	]`
	out, err := NormalizeTalentEffects(raw, newID)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, `"foundryId":"`+fmtID(1)+`"`) {
		t.Fatalf("missing assigned id: %s", out)
	}
	if !strings.Contains(out, `"priority":20`) {
		t.Fatalf("missing default priority: %s", out)
	}

	again, err := NormalizeTalentEffects(out, func() (string, error) {
		t.Fatal("existing ids must be kept")
		return "", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if again != out {
		t.Fatalf("resave changed json\n%s\n%s", out, again)
	}

	if _, err := NormalizeTalentEffects(`[{"name":"Bad","changes":[{"key":"nope","mode":"add","value":"1"}]}]`, newID); err == nil {
		t.Fatal("expected invalid key")
	}
	if _, err := NormalizeTalentEffects(`[{"name":"Bad","changes":[{"key":"system.skills.stab.attackMod","mode":"custom","value":"1"}]}]`, newID); err == nil {
		t.Fatal("expected invalid mode")
	}
	empty, err := NormalizeTalentEffects("", newID)
	if err != nil || empty != "[]" {
		t.Fatalf("empty: %q %v", empty, err)
	}
}

func fmtID(n int) string {
	return strings.ReplaceAll(strings.Repeat("a", 15)+string(rune('0'+n)), " ", "")
}
