package export

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// LangClosedInput is closed-vocabulary + catalog content for Foundry lang JSON.
type LangClosedInput struct {
	Ability        map[string]AbilityLabel
	Skill          map[string]string
	Proficiency    map[string]string
	Outcome        map[string]string
	Save           map[string]string
	Difficulty     map[string]string
	Attributes     map[string]string
	Condition      map[string]string
	Injury         InjuryLabels
	Specialization map[string]map[string]string // skill slug → leaf → label

	// Descriptions for closed vocab (labels stay in Ability / Skill / Specialization).
	AbilityDescription        map[string]string
	SkillDescription          map[string]string
	SpecializationDescription map[string]map[string]string

	// Catalog content (origins + talents): label + HTML description by slug.
	Region     map[string]ContentEntry
	Culture    map[string]ContentEntry // race
	Background map[string]ContentEntry
	Class      map[string]ContentEntry
	Talent     map[string]ContentEntry
}

// AbilityLabel is the Foundry Ability i18n shape.
type AbilityLabel struct {
	Label       string
	Abbr        string
	Description string
}

// ContentEntry is a Forge-authored label + description for Foundry Content.* keys.
type ContentEntry struct {
	Label       string
	Description string
}

// InjuryLabels mirrors KEDOM.Injury nesting.
type InjuryLabels struct {
	Severity   map[string]string
	Location   map[string]string
	WeaponType map[string]string
}

// RequiredAbilitySlugs must exist in SQLite (matches packages/system config).
var RequiredAbilitySlugs = []string{"mgh", "dex", "kno", "foc", "pre", "lck"}

// RequiredSkillSlugs must exist in SQLite.
var RequiredSkillSlugs = []string{
	"arcana", "conduct", "connect", "convince", "craft", "exert", "guile",
	"heal", "investigate", "lore", "notice", "prowl", "punch", "shoot",
	"stab", "survive", "travel", "work", "worship",
}

// RequiredProficiencySlugs must exist in SQLite.
var RequiredProficiencySlugs = []string{
	"untrained", "apprentice", "trained", "expert", "master", "legendary",
}

var kedomKeyOrder = []string{
	"System",
	"Ability", "Skill", "Proficiency", "Outcome",
	"Sheet", "Chat",
	"Save", "Difficulty", "Attributes", "Condition", "Injury",
	"Roll", "Error", "Settings", "Specialization",
	"AbilityDescription", "SkillDescription", "SpecializationDescription",
	"Content", "Creation",
}

// WriteLangFile merges closed vocab into an existing lang JSON file.
func WriteLangFile(path string, closed LangClosedInput) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}

	root, err := parseLangRoot(raw)
	if err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}

	kedom, ok := root["KEDOM"].(map[string]any)
	if !ok {
		return fmt.Errorf("%s: missing KEDOM object", path)
	}

	sheetMerged, err := mergeDuplicateKeyObjects(raw, "Sheet")
	if err != nil {
		return fmt.Errorf("%s: merge Sheet: %w", path, err)
	}
	if sheetMerged != nil {
		kedom["Sheet"] = sheetMerged
	}

	kedom["Ability"] = abilityToOrdered(closed.Ability)
	kedom["Skill"] = stringMapToOrdered(closed.Skill)
	kedom["Proficiency"] = stringMapToOrdered(closed.Proficiency)
	kedom["Outcome"] = stringMapToOrdered(closed.Outcome)
	kedom["Save"] = stringMapToOrdered(closed.Save)
	kedom["Difficulty"] = stringMapToOrdered(closed.Difficulty)
	kedom["Attributes"] = stringMapToOrdered(closed.Attributes)
	kedom["Condition"] = stringMapToOrdered(closed.Condition)
	kedom["Injury"] = orderedObject([]kv{
		{k: "Severity", v: stringMapToOrdered(closed.Injury.Severity)},
		{k: "Location", v: stringMapToOrdered(closed.Injury.Location)},
		{k: "WeaponType", v: stringMapToOrdered(closed.Injury.WeaponType)},
	})
	kedom["Specialization"] = specializationToOrdered(closed.Specialization)
	kedom["AbilityDescription"] = stringMapToOrdered(closed.AbilityDescription)
	kedom["SkillDescription"] = stringMapToOrdered(closed.SkillDescription)
	kedom["SpecializationDescription"] = specializationToOrdered(closed.SpecializationDescription)
	kedom["Content"] = contentRootToOrdered(closed)
	applyCreationCatalogLabels(kedom, closed)

	root["KEDOM"] = kedom

	out, err := marshalLangFile(root)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, out, 0o644)
}

// ValidateClosedSlugs fails if required Foundry config slugs are missing.
func ValidateClosedSlugs(en LangClosedInput) error {
	var missing []string
	for _, s := range RequiredAbilitySlugs {
		if _, ok := en.Ability[s]; !ok {
			missing = append(missing, "Ability."+s)
		}
	}
	for _, s := range RequiredSkillSlugs {
		if _, ok := en.Skill[s]; !ok {
			missing = append(missing, "Skill."+s)
		}
	}
	for _, s := range RequiredProficiencySlugs {
		if _, ok := en.Proficiency[s]; !ok {
			missing = append(missing, "Proficiency."+s)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing closed-vocab slugs in SQLite: %s", strings.Join(missing, ", "))
	}
	return nil
}

func parseLangRoot(raw []byte) (map[string]any, error) {
	var root map[string]any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&root); err != nil {
		return nil, err
	}
	return root, nil
}

func mergeDuplicateKeyObjects(raw []byte, key string) (map[string]any, error) {
	needle := []byte(`"` + key + `"`)
	merged := map[string]any{}
	found := false
	data := raw
	for {
		i := bytes.Index(data, needle)
		if i < 0 {
			break
		}
		rest := data[i+len(needle):]
		colon := bytes.IndexByte(rest, ':')
		if colon < 0 {
			break
		}
		rest = bytes.TrimLeft(rest[colon+1:], " \t\r\n")
		if len(rest) == 0 || rest[0] != '{' {
			data = data[i+len(needle):]
			continue
		}
		objBytes, err := readBalancedObject(rest)
		if err != nil {
			return nil, err
		}
		var obj map[string]any
		if err := json.Unmarshal(objBytes, &obj); err != nil {
			return nil, err
		}
		for k, v := range obj {
			merged[k] = v
		}
		found = true
		data = rest[len(objBytes):]
	}
	if !found {
		return nil, nil
	}
	return merged, nil
}

func readBalancedObject(data []byte) ([]byte, error) {
	if len(data) == 0 || data[0] != '{' {
		return nil, fmt.Errorf("expected object")
	}
	depth := 0
	inString := false
	escape := false
	for i := 0; i < len(data); i++ {
		c := data[i]
		if inString {
			if escape {
				escape = false
				continue
			}
			if c == '\\' {
				escape = true
				continue
			}
			if c == '"' {
				inString = false
			}
			continue
		}
		switch c {
		case '"':
			inString = true
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return data[:i+1], nil
			}
		}
	}
	return nil, fmt.Errorf("unbalanced object")
}

type kv struct {
	k string
	v any
}

type orderedObject []kv

func (o orderedObject) MarshalJSON() ([]byte, error) {
	var b bytes.Buffer
	b.WriteByte('{')
	for i, item := range o {
		if i > 0 {
			b.WriteByte(',')
		}
		key, err := json.Marshal(item.k)
		if err != nil {
			return nil, err
		}
		b.Write(key)
		b.WriteByte(':')
		val, err := marshalValue(item.v)
		if err != nil {
			return nil, err
		}
		b.Write(val)
	}
	b.WriteByte('}')
	return b.Bytes(), nil
}

func abilityToOrdered(m map[string]AbilityLabel) orderedObject {
	keys := sortedStringKeys(m)
	out := make(orderedObject, 0, len(keys))
	for _, k := range keys {
		a := m[k]
		fields := orderedObject{
			{k: "label", v: a.Label},
			{k: "abbr", v: a.Abbr},
		}
		if strings.TrimSpace(a.Description) != "" {
			fields = append(fields, kv{k: "description", v: a.Description})
		}
		out = append(out, kv{k: k, v: fields})
	}
	return out
}

func contentEntryToOrdered(e ContentEntry) orderedObject {
	fields := orderedObject{{k: "label", v: e.Label}}
	if strings.TrimSpace(e.Description) != "" {
		fields = append(fields, kv{k: "description", v: e.Description})
	}
	return fields
}

func contentMapToOrdered(m map[string]ContentEntry) orderedObject {
	keys := sortedStringKeys(m)
	out := make(orderedObject, 0, len(keys))
	for _, k := range keys {
		out = append(out, kv{k: k, v: contentEntryToOrdered(m[k])})
	}
	return out
}

func contentRootToOrdered(closed LangClosedInput) orderedObject {
	return orderedObject{
		{k: "Region", v: contentMapToOrdered(closed.Region)},
		{k: "Culture", v: contentMapToOrdered(closed.Culture)},
		{k: "Background", v: contentMapToOrdered(closed.Background)},
		{k: "Class", v: contentMapToOrdered(closed.Class)},
		{k: "Talent", v: contentMapToOrdered(closed.Talent)},
	}
}

// applyCreationCatalogLabels merges Forge catalog labels into Creation.Region/Culture/…
// while preserving Wizard / Step / FreeSpec chrome keys.
func applyCreationCatalogLabels(kedom map[string]any, closed LangClosedInput) {
	creation, _ := kedom["Creation"].(map[string]any)
	if creation == nil {
		creation = map[string]any{}
	}
	creation["Region"] = mergeCreationLabelMap(creation["Region"], closed.Region)
	creation["Culture"] = mergeCreationLabelMap(creation["Culture"], closed.Culture)
	creation["Background"] = mergeCreationLabelMap(creation["Background"], closed.Background)
	creation["Class"] = mergeCreationLabelMap(creation["Class"], closed.Class)
	kedom["Creation"] = creation
}

func mergeCreationLabelMap(existing any, forge map[string]ContentEntry) orderedObject {
	merged := map[string]string{}
	switch m := existing.(type) {
	case map[string]any:
		for k, v := range m {
			if s, ok := v.(string); ok {
				merged[k] = s
			}
		}
	case orderedObject:
		for _, item := range m {
			if s, ok := item.v.(string); ok {
				merged[item.k] = s
			}
		}
	}
	for k, e := range forge {
		if strings.TrimSpace(e.Label) != "" {
			merged[k] = e.Label
		}
	}
	return stringMapToOrdered(merged)
}

func stringMapToOrdered(m map[string]string) orderedObject {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make(orderedObject, 0, len(keys))
	for _, k := range keys {
		out = append(out, kv{k: k, v: m[k]})
	}
	return out
}

func specializationToOrdered(m map[string]map[string]string) orderedObject {
	skills := sortedStringKeys(m)
	out := make(orderedObject, 0, len(skills))
	for _, skill := range skills {
		out = append(out, kv{k: skill, v: stringMapToOrdered(m[skill])})
	}
	return out
}

func sortedStringKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func marshalLangFile(root map[string]any) ([]byte, error) {
	kedom, _ := root["KEDOM"].(map[string]any)
	kedomOrdered := orderKEDOMMap(kedom)

	top := orderedObject{}
	if t, ok := root["TYPES"]; ok {
		top = append(top, kv{k: "TYPES", v: t})
	}
	top = append(top, kv{k: "KEDOM", v: kedomOrdered})

	raw, err := json.MarshalIndent(top, "", "  ")
	if err != nil {
		return nil, err
	}
	raw = append(raw, '\n')
	return raw, nil
}

func orderKEDOMMap(k map[string]any) orderedObject {
	if k == nil {
		return nil
	}
	seen := map[string]bool{}
	out := make(orderedObject, 0, len(k))
	for _, key := range kedomKeyOrder {
		if v, ok := k[key]; ok {
			out = append(out, kv{k: key, v: normalizeChromeValue(key, v)})
			seen[key] = true
		}
	}
	rest := make([]string, 0)
	for key := range k {
		if !seen[key] {
			rest = append(rest, key)
		}
	}
	sort.Strings(rest)
	for _, key := range rest {
		out = append(out, kv{k: key, v: k[key]})
	}
	return out
}

func normalizeChromeValue(key string, v any) any {
	if key != "Sheet" {
		return v
	}
	// Prefer stable Sheet key order when Sheet is a plain map from merge.
	m, ok := v.(map[string]any)
	if !ok {
		return v
	}
	prefer := []string{"Character", "Abilities", "Skills", "Mod", "Roll", "Tab", "Mode", "Action", "searchPlaceholder"}
	seen := map[string]bool{}
	out := make(orderedObject, 0, len(m))
	for _, k := range prefer {
		if val, ok := m[k]; ok {
			out = append(out, kv{k: k, v: val})
			seen[k] = true
		}
	}
	rest := make([]string, 0)
	for k := range m {
		if !seen[k] {
			rest = append(rest, k)
		}
	}
	sort.Strings(rest)
	for _, k := range rest {
		out = append(out, kv{k: k, v: m[k]})
	}
	return out
}

func marshalValue(v any) ([]byte, error) {
	switch t := v.(type) {
	case orderedObject:
		return t.MarshalJSON()
	default:
		return json.Marshal(t)
	}
}
