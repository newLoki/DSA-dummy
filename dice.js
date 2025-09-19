// dice.js

export function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

export function qualityLevel(tap) {
  if (tap < 1) return 0;
  if (tap <= 3) return 1;
  if (tap <= 6) return 2;
  if (tap <= 9) return 3;
  if (tap <= 12) return 4;
  if (tap <= 15) return 5;
  return 6;
}

/**
 * Process a skill roll.
 * @param {object} skill - Skill object {name, attr[], value, spec, category}
 * @param {object} attributes - Character attributes {MU, KL, ...}
 * @param {boolean} useSpec - Whether to use specialization bonus
 * @param {Array} rolls - Array of dice rolls
 * @param {Array} singleRollCategories - Categories with only one roll
 * @returns {object} - {tap, success, qs, isCritical, criticalText, details}
 */
export function processSkillRoll(skill, attributes, useSpec, rolls, singleRollCategories) {
  const ones = rolls.filter(r => r === 1).length;
  const twenties = rolls.filter(r => r === 20).length;
  let isCritical = false;
  let criticalText = "";
  if (ones >= 2) { isCritical = true; criticalText = "✅ Kritischer Erfolg"; }
  if (twenties >= 2) { isCritical = true; criticalText = "❌ Kritischer Patzer"; }

  let taw = skill.value + (useSpec && skill.spec ? 2 : 0);
  let success = true;
  const rollDetails = [];
  
  skill.attr.forEach((a, i) => {
    const roll = rolls[i] !== undefined ? rolls[i] : rolls[0];
    const val = attributes[a] || 0;
    const diff = roll - val;
    if (diff > 0) taw -= diff;
    if (taw < 0) success = false;
    rollDetails.push(`${a}: geworfen ${roll} vs benötigt ${val} → ${diff <= 0 ? "✔" : "✘"}`);
  });

  const tap = success ? taw : -1;
  const qs = success ? qualityLevel(tap) : 0;

  return { tap, success, qs, isCritical, criticalText, details: rollDetails };
}

/**
 * Roll a single attribute.
 * @param {number} val - Attribute value
 * @returns {object} - {roll, success, critical, details}
 */
export function rollAttribute(val) {
  const roll = rollD20();
  const success = roll <= val;
  const critical = roll === 1 ? "✅ Kritischer Erfolg" : roll === 20 ? "❌ Kritischer Patzer" : null;
  const details = [`geworfen ${roll} vs benötigt ${val} → ${success ? "✔" : "✘"}`];
  return { roll, success, critical, details };
}
