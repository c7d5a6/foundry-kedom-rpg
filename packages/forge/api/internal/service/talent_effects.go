package service

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// Talent effect documents stored in talent.effects_json and exported as Active Effects.
// Modes are Foundry v14 change-type strings.

var effectModes = map[string]struct{}{
	"add":       {},
	"subtract":  {},
	"multiply":  {},
	"override":  {},
	"upgrade":   {},
	"downgrade": {},
}

var effectKeyPattern = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$`)
var foundryIDPattern = regexp.MustCompile(`^[A-Za-z0-9]{16}$`)

// TalentEffectChange is one Active Effect change.
type TalentEffectChange struct {
	Key      string `json:"key"`
	Mode     string `json:"mode"`
	Value    string `json:"value"`
	Priority int    `json:"priority"`
}

type talentEffectChangeIn struct {
	Key      string `json:"key"`
	Mode     string `json:"mode"`
	Value    string `json:"value"`
	Priority *int   `json:"priority"`
}

type talentEffectIn struct {
	FoundryID string                 `json:"foundryId"`
	Name      string                 `json:"name"`
	Img       string                 `json:"img"`
	Disabled  bool                   `json:"disabled"`
	Changes   []talentEffectChangeIn `json:"changes"`
}

// TalentEffect is one transferable Active Effect on a talent.
type TalentEffect struct {
	FoundryID string               `json:"foundryId"`
	Name      string               `json:"name"`
	Img       string               `json:"img"`
	Disabled  bool                 `json:"disabled"`
	Changes   []TalentEffectChange `json:"changes"`
}

// NormalizeTalentEffects validates author input and returns canonical JSON.
// Empty input becomes "[]". Missing foundry ids are assigned via newID and kept on later saves.
func NormalizeTalentEffects(raw string, newID func() (string, error)) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		trimmed = "[]"
	}
	var incoming []talentEffectIn
	if err := json.Unmarshal([]byte(trimmed), &incoming); err != nil {
		return "", fmt.Errorf("%w: effects_json must be a JSON array", ErrInvalid)
	}
	effects := make([]TalentEffect, 0, len(incoming))
	seen := map[string]struct{}{}
	for i, in := range incoming {
		name := strings.TrimSpace(in.Name)
		if name == "" {
			return "", fmt.Errorf("%w: effect %d needs a name", ErrInvalid, i+1)
		}
		img := strings.TrimSpace(in.Img)
		if img == "" {
			img = "icons/svg/aura.svg"
		}
		id := strings.TrimSpace(in.FoundryID)
		if id == "" {
			var err error
			id, err = newID()
			if err != nil {
				return "", err
			}
		}
		if !foundryIDPattern.MatchString(id) {
			return "", fmt.Errorf("%w: effect %q has an invalid id", ErrInvalid, name)
		}
		if _, ok := seen[id]; ok {
			return "", fmt.Errorf("%w: duplicate effect id %s", ErrInvalid, id)
		}
		seen[id] = struct{}{}
		changes := make([]TalentEffectChange, 0, len(in.Changes))
		for j, ch := range in.Changes {
			key := strings.TrimSpace(ch.Key)
			mode := strings.TrimSpace(ch.Mode)
			value := strings.TrimSpace(ch.Value)
			if !effectKeyPattern.MatchString(key) {
				return "", fmt.Errorf("%w: effect %q change %d key must be a dot path", ErrInvalid, name, j+1)
			}
			if _, ok := effectModes[mode]; !ok {
				return "", fmt.Errorf("%w: effect %q change %d mode %q", ErrInvalid, name, j+1, mode)
			}
			if value == "" {
				return "", fmt.Errorf("%w: effect %q change %d needs a value", ErrInvalid, name, j+1)
			}
			priority := 20
			if ch.Priority != nil {
				priority = *ch.Priority
			}
			changes = append(changes, TalentEffectChange{
				Key: key, Mode: mode, Value: value, Priority: priority,
			})
		}
		effects = append(effects, TalentEffect{
			FoundryID: id, Name: name, Img: img, Disabled: in.Disabled, Changes: changes,
		})
	}
	out, err := json.Marshal(effects)
	if err != nil {
		return "", err
	}
	return string(out), nil
}
