-- Seed settled core vocabulary. foundry_id values are deterministic and must
-- never change once worlds reference them. Russian labels come from lang/ru.json
-- (attributes, skills) and docs/rules/30-character-creation.md (classes).

PRAGMA foreign_keys = ON;

-- Attributes (ids 1-6)
INSERT INTO attribute (id, slug, label, abbreviation, description, sort_order) VALUES
	(1, 'mgh', 'Might',     'MGH', '', 1),
	(2, 'dex', 'Dexterity', 'DEX', '', 2),
	(3, 'kno', 'Knowledge', 'KNO', '', 3),
	(4, 'foc', 'Focus',     'FOC', '', 4),
	(5, 'pre', 'Presence',  'PRE', '', 5),
	(6, 'lck', 'Luck',      'LCK', '', 6);

-- Skills (ids 1-19). Attribute mapping from docs/rules/10-attributes.md.
INSERT INTO skill (id, slug, label, description, attribute_id, specialization_mode, is_secondary, sort_order, foundry_id) VALUES
	(1,  'arcana',      'Arcana',      '', 3, 'free',          0, 1,  'kdmskl00arcana00'),
	(2,  'connect',     'Connect',     '', 5, 'free',          0, 2,  'kdmskl00connect0'),
	(3,  'conduct',     'Conduct',     '', 5, 'fixed',         0, 3,  'kdmskl00conduct0'),
	(4,  'convince',    'Convince',    '', 5, 'fixed',         0, 4,  'kdmskl0convince0'),
	(5,  'craft',       'Craft',       '', 2, 'free',          0, 5,  'kdmskl000craft00'),
	(6,  'exert',       'Exert',       '', 1, 'none',          0, 6,  'kdmskl000exert00'),
	(7,  'guile',       'Guile',       '', 3, 'fixed',         0, 7,  'kdmskl000guile00'),
	(8,  'heal',        'Heal',        '', 3, 'fixed',         0, 8,  'kdmskl0000heal00'),
	(9,  'investigate', 'Investigate', '', 3, 'fixed',         0, 9,  'kdmsklinvestiga0'),
	(10, 'lore',        'Lore',        '', 3, 'free',          0, 10, 'kdmskl0000lore00'),
	(11, 'notice',      'Notice',      '', 4, 'fixed',         0, 11, 'kdmskl00notice00'),
	(12, 'prowl',       'Prowl',       '', 2, 'fixed',         0, 12, 'kdmskl000prowl00'),
	(13, 'punch',       'Punch',       '', 1, 'none',          0, 13, 'kdmskl000punch00'),
	(14, 'shoot',       'Shoot',       '', 2, 'none',          0, 14, 'kdmskl000shoot00'),
	(15, 'stab',        'Stab',        '', 1, 'none',          0, 15, 'kdmskl0000stab00'),
	(16, 'survive',     'Survive',     '', 4, 'parameterized', 0, 16, 'kdmskl0survive00'),
	(17, 'travel',      'Travel',      '', 1, 'parameterized', 0, 17, 'kdmskl00travel00'),
	(18, 'work',        'Work',        '', 1, 'free',          0, 18, 'kdmskl0000work00'),
	(19, 'worship',     'Worship',     '', 5, 'free',          0, 19, 'kdmskl0worship00');

-- Fixed specialisations only (no Environment / Exotic / pantheon slots yet).
INSERT INTO specialization (id, slug, label, description, skill_id, parameter, sort_order, foundry_id) VALUES
	-- Conduct (3)
	(1,  'conduct.bureaucracy',   'Bureaucracy',   '', 3, NULL, 1, 'kdmsp00000000001'),
	(2,  'conduct.etiquette',     'Etiquette',     '', 3, NULL, 2, 'kdmsp00000000002'),
	(3,  'conduct.law',           'Law',           '', 3, NULL, 3, 'kdmsp00000000003'),
	(4,  'conduct.organizations', 'Organizations', '', 3, NULL, 4, 'kdmsp00000000004'),
	(5,  'conduct.politics',      'Politics',      '', 3, NULL, 5, 'kdmsp00000000005'),
	(6,  'conduct.rumors',        'Rumors',        '', 3, NULL, 6, 'kdmsp00000000006'),
	(7,  'conduct.streetwise',    'Streetwise',    '', 3, NULL, 7, 'kdmsp00000000007'),
	-- Convince (4)
	(8,  'convince.charm',         'Charm',         '', 4, NULL, 1, 'kdmsp00000000008'),
	(9,  'convince.command',       'Command',       '', 4, NULL, 2, 'kdmsp00000000009'),
	(10, 'convince.deception',     'Deception',     '', 4, NULL, 3, 'kdmsp00000000010'),
	(11, 'convince.haggle',        'Haggle',        '', 4, NULL, 4, 'kdmsp00000000011'),
	(12, 'convince.intimidation',  'Intimidation',  '', 4, NULL, 5, 'kdmsp00000000012'),
	(13, 'convince.performance',   'Performance',   '', 4, NULL, 6, 'kdmsp00000000013'),
	(14, 'convince.persuasion',    'Persuasion',    '', 4, NULL, 7, 'kdmsp00000000014'),
	-- Guile (7)
	(15, 'guile.disguise',  'Disguise',  '', 7, NULL, 1, 'kdmsp00000000015'),
	(16, 'guile.forgery',   'Forgery',   '', 7, NULL, 2, 'kdmsp00000000016'),
	(17, 'guile.fraud',     'Fraud',     '', 7, NULL, 3, 'kdmsp00000000017'),
	(18, 'guile.gambling',  'Gambling',  '', 7, NULL, 4, 'kdmsp00000000018'),
	(19, 'guile.poisons',   'Poisons',   '', 7, NULL, 5, 'kdmsp00000000019'),
	(20, 'guile.traps',     'Traps',     '', 7, NULL, 6, 'kdmsp00000000020'),
	-- Heal (8)
	(21, 'heal.diagnosis',      'Diagnosis',      '', 8, NULL, 1, 'kdmsp00000000021'),
	(22, 'heal.firstaid',       'First Aid',      '', 8, NULL, 2, 'kdmsp00000000022'),
	(23, 'heal.pharmacology',   'Pharmacology',   '', 8, NULL, 3, 'kdmsp00000000023'),
	(24, 'heal.psychology',     'Psychology',     '', 8, NULL, 4, 'kdmsp00000000024'),
	(25, 'heal.rehabilitation', 'Rehabilitation', '', 8, NULL, 5, 'kdmsp00000000025'),
	(26, 'heal.surgery',        'Surgery',        '', 8, NULL, 6, 'kdmsp00000000026'),
	(27, 'heal.toxicology',     'Toxicology',     '', 8, NULL, 7, 'kdmsp00000000027'),
	-- Investigate (9)
	(28, 'investigate.appraisal',     'Appraisal',     '', 9, NULL, 1, 'kdmsp00000000028'),
	(29, 'investigate.cryptography',  'Cryptography',  '', 9, NULL, 2, 'kdmsp00000000029'),
	(30, 'investigate.investigation', 'Investigation', '', 9, NULL, 3, 'kdmsp00000000030'),
	(31, 'investigate.libraryuse',    'Library Use',   '', 9, NULL, 4, 'kdmsp00000000031'),
	(32, 'investigate.research',      'Research',      '', 9, NULL, 5, 'kdmsp00000000032'),
	(33, 'investigate.search',        'Search',        '', 9, NULL, 6, 'kdmsp00000000033'),
	-- Notice (11)
	(34, 'notice.anomalies', 'Anomalies', '', 11, NULL, 1, 'kdmsp00000000034'),
	(35, 'notice.awareness', 'Awareness', '', 11, NULL, 2, 'kdmsp00000000035'),
	(36, 'notice.detail',    'Detail',    '', 11, NULL, 3, 'kdmsp00000000036'),
	(37, 'notice.farsight',  'Farsight',  '', 11, NULL, 4, 'kdmsp00000000037'),
	(38, 'notice.hidden',    'Hidden',    '', 11, NULL, 5, 'kdmsp00000000038'),
	(39, 'notice.insight',   'Insight',   '', 11, NULL, 6, 'kdmsp00000000039'),
	(40, 'notice.listen',    'Listen',    '', 11, NULL, 7, 'kdmsp00000000040'),
	-- Prowl (12)
	(41, 'prowl.backstabbing',  'Backstabbing',   '', 12, NULL, 1, 'kdmsp00000000041'),
	(42, 'prowl.climbing',      'Climbing',       '', 12, NULL, 2, 'kdmsp00000000042'),
	(43, 'prowl.hide',          'Hide',           '', 12, NULL, 3, 'kdmsp00000000043'),
	(44, 'prowl.lockpicking',   'Lockpicking',    '', 12, NULL, 4, 'kdmsp00000000044'),
	(45, 'prowl.sleightofhand', 'Sleight of Hand', '', 12, NULL, 5, 'kdmsp00000000045'),
	(46, 'prowl.sneaking',      'Sneaking',       '', 12, NULL, 6, 'kdmsp00000000046'),
	-- Survive fixed (16); Environment slots deferred
	(47, 'survive.foraging', 'Foraging', '', 16, NULL, 1, 'kdmsp00000000047'),
	(48, 'survive.scouting', 'Scouting', '', 16, NULL, 2, 'kdmsp00000000048'),
	(49, 'survive.shelter',  'Shelter',  '', 16, NULL, 3, 'kdmsp00000000049'),
	(50, 'survive.tracking', 'Tracking', '', 16, NULL, 4, 'kdmsp00000000050'),
	-- Travel fixed (17); Exotic deferred
	(51, 'travel.hiking',      'Hiking',      '', 17, NULL, 1, 'kdmsp00000000051'),
	(52, 'travel.riding',      'Riding',      '', 17, NULL, 2, 'kdmsp00000000052'),
	(53, 'travel.driving',     'Driving',     '', 17, NULL, 3, 'kdmsp00000000053'),
	(54, 'travel.sailing',     'Sailing',     '', 17, NULL, 4, 'kdmsp00000000054'),
	(55, 'travel.navigation',  'Navigation',  '', 17, NULL, 5, 'kdmsp00000000055'),
	(56, 'travel.orientation', 'Orientation', '', 17, NULL, 6, 'kdmsp00000000056');

-- Classes: five full+partial, seven partial-only. No Adventurer row.
INSERT INTO class (id, slug, label, description, is_full, is_partial, sort_order, foundry_id) VALUES
	(1,  'warrior',          'Warrior',          '', 1, 1, 1,  'kdmcls0warrior00'),
	(2,  'expert',           'Expert',           '', 1, 1, 2,  'kdmcls00expert00'),
	(3,  'queran-arcanist',  'Queran Arcanist',  '', 1, 1, 3,  'kdmcls0queranar0'),
	(4,  'elementalist',     'Elementalist',     '', 1, 1, 4,  'kdmcls0elemental'),
	(5,  'necromancer',      'Necromancer',      '', 1, 1, 5,  'kdmcls0necroman0'),
	(6,  'priest',           'Priest',           '', 0, 1, 6,  'kdmcls00priest00'),
	(7,  'wise',             'Wise',             '', 0, 1, 7,  'kdmcls0000wise00'),
	(8,  'accursed',         'Accursed',         '', 0, 1, 8,  'kdmcls0accursed0'),
	(9,  'duelist',          'Duelist',          '', 0, 1, 9,  'kdmcls0duelist00'),
	(10, 'empath',           'Empath',           '', 0, 1, 10, 'kdmcls00empath00'),
	(11, 'rune-guardian',    'Rune Guardian',    '', 0, 1, 11, 'kdmcls0runeguard'),
	(12, 'beast',            'Beast',            '', 0, 1, 12, 'kdmcls000beast00');

-- Russian attribute labels + abbreviations (from lang/ru.json)
INSERT INTO translation (entity_kind, entity_id, locale, field, value) VALUES
	('attribute', 1, 'ru', 'label', 'Мощь'),
	('attribute', 1, 'ru', 'abbreviation', 'МЩ'),
	('attribute', 2, 'ru', 'label', 'Ловкость'),
	('attribute', 2, 'ru', 'abbreviation', 'ЛВК'),
	('attribute', 3, 'ru', 'label', 'Знание'),
	('attribute', 3, 'ru', 'abbreviation', 'ЗНН'),
	('attribute', 4, 'ru', 'label', 'Средоточие'),
	('attribute', 4, 'ru', 'abbreviation', 'СРД'),
	('attribute', 5, 'ru', 'label', 'Присутствие'),
	('attribute', 5, 'ru', 'abbreviation', 'ПРС'),
	('attribute', 6, 'ru', 'label', 'Удача'),
	('attribute', 6, 'ru', 'abbreviation', 'УДЧ');

-- Russian skill labels (from lang/ru.json)
INSERT INTO translation (entity_kind, entity_id, locale, field, value) VALUES
	('skill', 1,  'ru', 'label', 'Аркана'),
	('skill', 2,  'ru', 'label', 'Связи'),
	('skill', 3,  'ru', 'label', 'Обхождение'),
	('skill', 4,  'ru', 'label', 'Убеждение'),
	('skill', 5,  'ru', 'label', 'Ремесло'),
	('skill', 6,  'ru', 'label', 'Натуга'),
	('skill', 7,  'ru', 'label', 'Хитрость'),
	('skill', 8,  'ru', 'label', 'Лечение'),
	('skill', 9,  'ru', 'label', 'Расследование'),
	('skill', 10, 'ru', 'label', 'Предания'),
	('skill', 11, 'ru', 'label', 'Внимательность'),
	('skill', 12, 'ru', 'label', 'Скрытность'),
	('skill', 13, 'ru', 'label', 'Кулачный бой'),
	('skill', 14, 'ru', 'label', 'Стрельба'),
	('skill', 15, 'ru', 'label', 'Холодное оружие'),
	('skill', 16, 'ru', 'label', 'Выживание'),
	('skill', 17, 'ru', 'label', 'Путешествия'),
	('skill', 18, 'ru', 'label', 'Труд'),
	('skill', 19, 'ru', 'label', 'Поклонение');

-- Russian class labels (from docs/rules/30-character-creation.md)
INSERT INTO translation (entity_kind, entity_id, locale, field, value) VALUES
	('class', 1,  'ru', 'label', 'Воин'),
	('class', 2,  'ru', 'label', 'Эксперт'),
	('class', 3,  'ru', 'label', 'Кверанский арканист'),
	('class', 4,  'ru', 'label', 'Элементалист'),
	('class', 5,  'ru', 'label', 'Некромант'),
	('class', 6,  'ru', 'label', 'Жрец'),
	('class', 7,  'ru', 'label', 'Ведун'),
	('class', 8,  'ru', 'label', 'Проклятый'),
	('class', 9,  'ru', 'label', 'Дуэлянт'),
	('class', 10, 'ru', 'label', 'Эмпат'),
	('class', 11, 'ru', 'label', 'Рунный защитник'),
	('class', 12, 'ru', 'label', 'Зверь');

-- Keep sqlite autoincrement sequences in sync with explicit ids.
DELETE FROM sqlite_sequence WHERE name IN ('attribute', 'skill', 'specialization', 'class', 'translation');
INSERT INTO sqlite_sequence (name, seq) VALUES
	('attribute', 6),
	('skill', 19),
	('specialization', 56),
	('class', 12);
