package model

// EntityKind identifies which content table a translation overlays.
type EntityKind string

const (
	EntityAttribute      EntityKind = "attribute"
	EntitySkill          EntityKind = "skill"
	EntitySpecialization EntityKind = "specialization"
	EntityClass          EntityKind = "class"
)

// Locale is a BCP 47 language tag. English is never stored in translation.
type Locale string

const LocaleRU Locale = "ru"

// TranslationField is a localisable column on an entity.
type TranslationField string

const (
	FieldLabel        TranslationField = "label"
	FieldAbbreviation TranslationField = "abbreviation"
	FieldDescription  TranslationField = "description"
)
