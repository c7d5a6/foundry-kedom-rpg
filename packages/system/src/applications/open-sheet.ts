/**
 * Open a document's sheet. fvtt-types types `document.sheet` as a union that still includes the
 * ApplicationV1 `render(force)` signature, so the supported `render({ force })` needs one cast.
 */
export async function openSheet(doc: { sheet?: unknown }): Promise<void> {
  const sheet = doc.sheet as foundry.applications.api.ApplicationV2 | null | undefined;
  await sheet?.render({ force: true });
}
