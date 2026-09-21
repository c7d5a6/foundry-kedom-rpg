package model

// EntityKind identifies which content table a translation overlays.
type EntityKind string

const (
	EntityAttribute       EntityKind = "attribute"
	EntitySkill           EntityKind = "skill"
	EntitySpecialization  EntityKind = "specialization"
	EntityClass           EntityKind = "class"
	EntityProficiency     EntityKind = "proficiency"
	EntityOutcome         EntityKind = "outcome"
	EntitySave            EntityKind = "save"
	EntityDifficulty      EntityKind = "difficulty"
	EntityDerived         EntityKind = "derived"
	EntityCondition       EntityKind = "condition"
	EntityInjurySeverity  EntityKind = "injury_severity"
	EntityInjuryLocation  EntityKind = "injury_location"
	EntityInjuryWeapon    EntityKind = "injury_weapon"
)

// VocabKinds are closed-vocabulary rows stored in the vocab table.
var VocabKinds = []EntityKind{
	EntityProficiency,
	EntityOutcome,
	EntitySave,
	EntityDifficulty,
	EntityDerived,
	EntityCondition,
	EntityInjurySeverity,
	EntityInjuryLocation,
	EntityInjuryWeapon,
}

// IsVocabKind reports whether kind is a vocab-table entity_kind.
func IsVocabKind(k EntityKind) bool {
	for _, v := range VocabKinds {
		if v == k {
			return true
		}
	}
	return false
}

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
