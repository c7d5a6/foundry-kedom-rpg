-- Seed closed vocab from packages/system/lang/{en,ru}.json and reconcile attribute RU drift.

PRAGMA foreign_keys = ON;

-- Reconcile foc RU label to match lang/ru.json (was Фокус in early seed).
UPDATE translation
SET value = 'Средоточие'
WHERE entity_kind = 'attribute'
	AND field = 'label'
	AND locale = 'ru'
	AND entity_id = (SELECT id FROM attribute WHERE slug = 'foc');

UPDATE translation
SET value = 'СРД'
WHERE entity_kind = 'attribute'
	AND field = 'abbreviation'
	AND locale = 'ru'
	AND entity_id = (SELECT id FROM attribute WHERE slug = 'foc');

-- Proficiency
INSERT INTO vocab (kind, slug, label, abbreviation, sort_order) VALUES
	('proficiency', 'untrained', 'Untrained', '', 1),
	('proficiency', 'apprentice', 'Apprentice', '', 2),
	('proficiency', 'trained', 'Trained', '', 3),
	('proficiency', 'expert', 'Expert', '', 4),
	('proficiency', 'master', 'Master', '', 5),
	('proficiency', 'legendary', 'Legendary', '', 6);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'proficiency', id, 'ru', 'label',
	CASE slug
		WHEN 'untrained' THEN 'Необученный'
		WHEN 'apprentice' THEN 'Ученик'
		WHEN 'trained' THEN 'Обученный'
		WHEN 'expert' THEN 'Эксперт'
		WHEN 'master' THEN 'Мастер'
		WHEN 'legendary' THEN 'Легендарный'
	END
FROM vocab WHERE kind = 'proficiency';

-- Outcome
INSERT INTO vocab (kind, slug, label, abbreviation, sort_order) VALUES
	('outcome', 'failure', 'Failure', '', 1),
	('outcome', 'cost', 'Success at a Cost', '', 2),
	('outcome', 'success', 'Success', '', 3);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'outcome', id, 'ru', 'label',
	CASE slug
		WHEN 'failure' THEN 'Провал'
		WHEN 'cost' THEN 'Успех с последствиями'
		WHEN 'success' THEN 'Успех'
	END
FROM vocab WHERE kind = 'outcome';

-- Save
INSERT INTO vocab (kind, slug, label, abbreviation, sort_order) VALUES
	('save', 'reflex', 'Reflex', '', 1),
	('save', 'fortitude', 'Fortitude', '', 2),
	('save', 'will', 'Will', '', 3);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'save', id, 'ru', 'label',
	CASE slug
		WHEN 'reflex' THEN 'Реакция'
		WHEN 'fortitude' THEN 'Стойкость'
		WHEN 'will' THEN 'Воля'
	END
FROM vocab WHERE kind = 'save';

-- Difficulty
INSERT INTO vocab (kind, slug, label, abbreviation, sort_order) VALUES
	('difficulty', 'challenging', 'Challenging', '', 1),
	('difficulty', 'hard', 'Hard', '', 2),
	('difficulty', 'veryHard', 'Very Hard', '', 3),
	('difficulty', 'incrediblyHard', 'Incredibly Hard', '', 4);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'difficulty', id, 'ru', 'label',
	CASE slug
		WHEN 'challenging' THEN 'Сложно'
		WHEN 'hard' THEN 'Трудно'
		WHEN 'veryHard' THEN 'Очень трудно'
		WHEN 'incrediblyHard' THEN 'Невероятно трудно'
	END
FROM vocab WHERE kind = 'difficulty';

-- Derived combat / sheet stats (KEDOM.Attributes)
INSERT INTO vocab (kind, slug, label, abbreviation, sort_order) VALUES
	('derived', 'hp', 'Hit Points', '', 1),
	('derived', 'hpShort', 'HP', '', 2),
	('derived', 'strain', 'System Strain', '', 3),
	('derived', 'strainShort', 'SS', '', 4),
	('derived', 'wounds', 'Wounds', '', 5),
	('derived', 'ac', 'Armor Class', '', 6),
	('derived', 'acShort', 'AC', '', 7),
	('derived', 'acMelee', 'Melee AC', '', 8),
	('derived', 'acRanged', 'Ranged AC', '', 9),
	('derived', 'attackBonus', 'Attack Bonus', '', 10),
	('derived', 'initiative', 'Initiative', '', 11),
	('derived', 'movement', 'Movement', '', 12),
	('derived', 'encumbrance', 'Encumbrance', '', 13),
	('derived', 'level', 'Level', '', 14),
	('derived', 'experience', 'Experience', '', 15);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'derived', id, 'ru', 'label',
	CASE slug
		WHEN 'hp' THEN 'Пункты здоровья'
		WHEN 'hpShort' THEN 'ПЗ'
		WHEN 'strain' THEN 'Системное напряжение'
		WHEN 'strainShort' THEN 'СН'
		WHEN 'wounds' THEN 'Раны'
		WHEN 'ac' THEN 'Класс брони'
		WHEN 'acShort' THEN 'КБ'
		WHEN 'acMelee' THEN 'КБ в ближнем бою'
		WHEN 'acRanged' THEN 'КБ против стрельбы'
		WHEN 'attackBonus' THEN 'Бонус атаки'
		WHEN 'initiative' THEN 'Инициатива'
		WHEN 'movement' THEN 'Перемещение'
		WHEN 'encumbrance' THEN 'Нагрузка'
		WHEN 'level' THEN 'Уровень'
		WHEN 'experience' THEN 'Опыт'
	END
FROM vocab WHERE kind = 'derived';

-- Conditions
INSERT INTO vocab (kind, slug, label, abbreviation, sort_order) VALUES
	('condition', 'stunned', 'Stunned', '', 1),
	('condition', 'paralyzed', 'Paralyzed', '', 2),
	('condition', 'prone', 'Prone', '', 3),
	('condition', 'blinded', 'Blinded', '', 4),
	('condition', 'deafened', 'Deafened', '', 5),
	('condition', 'ignited', 'Ignited', '', 6),
	('condition', 'slowed', 'Slowed', '', 7),
	('condition', 'sickened', 'Sickened', '', 8),
	('condition', 'wounded', 'Wounded', '', 9),
	('condition', 'strained', 'Strained', '', 10);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'condition', id, 'ru', 'label',
	CASE slug
		WHEN 'stunned' THEN 'Оглушён'
		WHEN 'paralyzed' THEN 'Парализован'
		WHEN 'prone' THEN 'Лежит'
		WHEN 'blinded' THEN 'Ослеплён'
		WHEN 'deafened' THEN 'Оглох'
		WHEN 'ignited' THEN 'Горит'
		WHEN 'slowed' THEN 'Замедлён'
		WHEN 'sickened' THEN 'Болен'
		WHEN 'wounded' THEN 'Ранен'
		WHEN 'strained' THEN 'Перенапряжён'
	END
FROM vocab WHERE kind = 'condition';

-- Injury severity
INSERT INTO vocab (kind, slug, label, abbreviation, sort_order) VALUES
	('injury_severity', 'minor', 'Minor', '', 1),
	('injury_severity', 'major', 'Major', '', 2),
	('injury_severity', 'severe', 'Severe', '', 3);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'injury_severity', id, 'ru', 'label',
	CASE slug
		WHEN 'minor' THEN 'Лёгкая'
		WHEN 'major' THEN 'Серьёзная'
		WHEN 'severe' THEN 'Тяжёлая'
	END
FROM vocab WHERE kind = 'injury_severity';

-- Injury location
INSERT INTO vocab (kind, slug, label, abbreviation, sort_order) VALUES
	('injury_location', 'head', 'Head', '', 1),
	('injury_location', 'body', 'Body', '', 2),
	('injury_location', 'arms', 'Arms', '', 3),
	('injury_location', 'legs', 'Legs', '', 4),
	('injury_location', 'bleed', 'Bleeding', '', 5);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'injury_location', id, 'ru', 'label',
	CASE slug
		WHEN 'head' THEN 'Голова'
		WHEN 'body' THEN 'Туловище'
		WHEN 'arms' THEN 'Руки'
		WHEN 'legs' THEN 'Ноги'
		WHEN 'bleed' THEN 'Кровотечение'
	END
FROM vocab WHERE kind = 'injury_location';

-- Injury weapon type
INSERT INTO vocab (kind, slug, label, abbreviation, sort_order) VALUES
	('injury_weapon', 'arrow', 'Arrow', '', 1),
	('injury_weapon', 'bullet', 'Bullet', '', 2),
	('injury_weapon', 'blunt', 'Blunt', '', 3),
	('injury_weapon', 'claws', 'Claws', '', 4),
	('injury_weapon', 'cutting', 'Cutting', '', 5),
	('injury_weapon', 'flame', 'Flame', '', 6),
	('injury_weapon', 'piercing', 'Piercing', '', 7),
	('injury_weapon', 'explosion', 'Explosion', '', 8);

INSERT INTO translation (entity_kind, entity_id, locale, field, value)
SELECT 'injury_weapon', id, 'ru', 'label',
	CASE slug
		WHEN 'arrow' THEN 'Стрела'
		WHEN 'bullet' THEN 'Пуля'
		WHEN 'blunt' THEN 'Дробящее'
		WHEN 'claws' THEN 'Когти'
		WHEN 'cutting' THEN 'Режущее'
		WHEN 'flame' THEN 'Пламя'
		WHEN 'piercing' THEN 'Колющее'
		WHEN 'explosion' THEN 'Взрыв'
	END
FROM vocab WHERE kind = 'injury_weapon';
