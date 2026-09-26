/**
 * Post Foundry rolls to chat (Dice So Nice listens to ChatMessage rolls).
 */

export async function postCreationRoll(
  formula: string,
  flavor: string,
): Promise<{ total: number; roll: Roll }> {
  const roll = await new Roll(formula).evaluate();
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    flavor,
    content: await roll.render(),
    rolls: [roll],
    sound: CONFIG.sounds.dice,
  });
  return { total: roll.total ?? 0, roll };
}

export async function postCreationRolls(
  items: ReadonlyArray<{ formula: string; label: string }>,
  flavor: string,
): Promise<number[]> {
  const rolls: Roll[] = [];
  const totals: number[] = [];
  const lines: string[] = [];
  for (const item of items) {
    const roll = await new Roll(item.formula).evaluate();
    rolls.push(roll);
    totals.push(roll.total ?? 0);
    lines.push(`<p><strong>${item.label}:</strong> ${roll.total ?? 0}</p>${await roll.render()}`);
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    flavor,
    content: lines.join(""),
    rolls,
    sound: CONFIG.sounds.dice,
  });
  return totals;
}
