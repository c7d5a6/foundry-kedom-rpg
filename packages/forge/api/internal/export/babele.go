package export

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// BabeleEntry is one document overlay keyed by English name.
type BabeleEntry struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// BabelePack is a Babele pack translation file.
type BabelePack struct {
	Label   string                 `json:"label"`
	Mapping map[string]string      `json:"mapping"`
	Entries map[string]BabeleEntry `json:"entries"`
}

// WriteBabeleArts writes lang/babele/ru/kedom.arts.json from RU overlays.
// Entries whose Russian label equals English are omitted.
func WriteBabeleArts(babeleDir string, arts []PackArt, ruBySlug map[string]ContentEntry) error {
	if err := os.MkdirAll(babeleDir, 0o755); err != nil {
		return err
	}
	entries := map[string]BabeleEntry{}
	for _, a := range arts {
		ru, ok := ruBySlug[a.Slug]
		if !ok {
			continue
		}
		name := ru.Label
		if name == "" || name == a.Label {
			continue
		}
		entry := BabeleEntry{Name: name}
		if ru.Description != "" && ru.Description != RenderDescriptionHTML(a.Description) {
			entry.Description = ru.Description
		}
		entries[a.Label] = entry
	}
	pack := BabelePack{
		Label:   "Arts",
		Mapping: map[string]string{"description": "system.description"},
		Entries: entries,
	}
	path := filepath.Join(babeleDir, "kedom.arts.json")
	raw, err := json.MarshalIndent(pack, "", "  ")
	if err != nil {
		return err
	}
	raw = append(raw, '\n')
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		return fmt.Errorf("write %s: %w", path, err)
	}
	return nil
}
