// Convert Open5e API data to Homebrewery markdown

function abilityMod(score) {
	const mod = Math.floor((score - 10) / 2);
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

function formatSpeed(speed) {
	if(typeof speed === 'string') return speed;
	if(typeof speed === 'object') {
		return Object.entries(speed)
			.map(([type, val])=>type === 'walk' ? `${val} ft.` : `${type} ${val} ft.`)
			.join(', ');
	}
	return '30 ft.';
}

function formatCR(cr) {
	const xpByCR = {
		'0': '0', '1/8': '25', '1/4': '50', '1/2': '100',
		'1': '200', '2': '450', '3': '700', '4': '1,100', '5': '1,800',
		'6': '2,300', '7': '2,900', '8': '3,900', '9': '5,000', '10': '5,900',
		'11': '7,200', '12': '8,400', '13': '10,000', '14': '11,500', '15': '13,000',
		'16': '15,000', '17': '18,000', '18': '20,000', '19': '22,000', '20': '25,000',
		'21': '33,000', '22': '41,000', '23': '50,000', '24': '62,000', '25': '75,000',
		'26': '90,000', '27': '105,000', '28': '120,000', '29': '135,000', '30': '155,000'
	};
	const xp = xpByCR[cr] || '0';
	return `${cr} (${xp} XP)`;
}

function formatSkills(skills) {
	if(!skills || typeof skills !== 'object') return '';
	const entries = Object.entries(skills);
	if(entries.length === 0) return '';
	return entries.map(([name, val])=>`${name} +${val}`).join(', ');
}

export function formatMonster(m) {
	const lines = [];

	lines.push(`{{monster,frame`);
	lines.push(`## ${m.name}`);
	lines.push(`*${m.size} ${m.type}${m.subtype ? ` (${m.subtype})` : ''}, ${m.alignment}*`);
	lines.push(`___`);
	lines.push(`**Armor Class** :: ${m.armor_class}${m.armor_desc ? ` (${m.armor_desc})` : ''}`);
	lines.push(`**Hit Points**  :: ${m.hit_points}${m.hit_dice ? ` (${m.hit_dice})` : ''}`);
	lines.push(`**Speed**       :: ${formatSpeed(m.speed)}`);
	lines.push(`___`);
	lines.push(`|  STR  |  DEX  |  CON  |  INT  |  WIS  |  CHA  |`);
	lines.push(`|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|`);
	lines.push(`|${m.strength} (${abilityMod(m.strength)})|${m.dexterity} (${abilityMod(m.dexterity)})|${m.constitution} (${abilityMod(m.constitution)})|${m.intelligence} (${abilityMod(m.intelligence)})|${m.wisdom} (${abilityMod(m.wisdom)})|${m.charisma} (${abilityMod(m.charisma)})|`);
	lines.push(`___`);

	const skills = formatSkills(m.skills);
	if(skills) lines.push(`**Skills** :: ${skills}`);
	if(m.damage_vulnerabilities) lines.push(`**Damage Vulnerabilities** :: ${m.damage_vulnerabilities}`);
	if(m.damage_resistances) lines.push(`**Damage Resistances** :: ${m.damage_resistances}`);
	if(m.damage_immunities) lines.push(`**Damage Immunities** :: ${m.damage_immunities}`);
	if(m.condition_immunities) lines.push(`**Condition Immunities** :: ${m.condition_immunities}`);

	const senses = [m.senses, `passive Perception ${m.perception || 10}`].filter(Boolean).join(', ');
	lines.push(`**Senses** :: ${senses}`);
	lines.push(`**Languages** :: ${m.languages || 'None'}`);
	lines.push(`**Challenge** :: ${formatCR(m.challenge_rating)}`);
	lines.push(`___`);

	if(m.special_abilities?.length) {
		for(const ability of m.special_abilities) {
			lines.push(`***${ability.name}.*** ${ability.desc}`);
			lines.push(`:`)
		}
	}

	if(m.actions?.length) {
		lines.push(`### Actions`);
		for(const action of m.actions) {
			lines.push(`***${action.name}.*** ${action.desc}`);
			lines.push(`:`)
		}
	}

	if(m.bonus_actions?.length) {
		lines.push(`### Bonus Actions`);
		for(const action of m.bonus_actions) {
			lines.push(`***${action.name}.*** ${action.desc}`);
			lines.push(`:`)
		}
	}

	if(m.reactions?.length) {
		lines.push(`### Reactions`);
		for(const reaction of m.reactions) {
			lines.push(`***${reaction.name}.*** ${reaction.desc}`);
			lines.push(`:`)
		}
	}

	if(m.legendary_actions?.length) {
		lines.push(`### Legendary Actions`);
		if(m.legendary_desc) lines.push(m.legendary_desc);
		lines.push(`:`)
		for(const action of m.legendary_actions) {
			lines.push(`***${action.name}.*** ${action.desc}`);
			lines.push(`:`)
		}
	}

	lines.push(`}}`);
	lines.push(``);

	return lines.join('\n');
}

export function formatSpell(s) {
	const lines = [];

	let levelSchool;
	if(s.level_int === 0) {
		levelSchool = `*${s.school} cantrip*`;
	} else {
		levelSchool = `*${s.level}-level ${s.school}${s.ritual === 'yes' ? ' (ritual)' : ''}*`;
	}

	let components = [];
	if(s.requires_verbal_components) components.push('V');
	if(s.requires_somatic_components) components.push('S');
	if(s.requires_material_components) components.push('M');
	let componentStr = components.join(', ');
	if(s.material) componentStr += ` (${s.material})`;

	lines.push(`#### ${s.name}`);
	lines.push(levelSchool);
	lines.push(``);
	lines.push(`**Casting Time:** :: ${s.casting_time}`);
	lines.push(`**Range:**        :: ${s.range}`);
	lines.push(`**Components:**   :: ${componentStr}`);
	lines.push(`**Duration:**     :: ${s.concentration === 'yes' ? 'Concentration, ' : ''}${s.duration}`);
	lines.push(``);
	lines.push(s.desc);

	if(s.higher_level) {
		lines.push(``);
		lines.push(`***At Higher Levels.*** ${s.higher_level}`);
	}

	lines.push(``);

	return lines.join('\n');
}

export function formatMagicItem(item) {
	const lines = [];

	let typeLine = item.type || 'Wondrous item';
	if(item.rarity) typeLine += `, ${item.rarity}`;
	if(item.requires_attunement) typeLine += ` (${item.requires_attunement})`;

	lines.push(`#### ${item.name}`);
	lines.push(`*${typeLine}*`);
	lines.push(`:`);
	lines.push(item.desc);
	lines.push(``);

	return lines.join('\n');
}
