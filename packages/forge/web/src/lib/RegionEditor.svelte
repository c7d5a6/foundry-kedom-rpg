<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import {
    api,
    type Background,
    type Race,
    type Region,
    type RegionBackgroundIn,
    type RegionCultureIn,
    type TranslationField,
  } from "$lib/api";
  import RichTextField from "$lib/RichTextField.svelte";
  import LinkPanel from "$lib/LinkPanel.svelte";

  type CultureDraft = { race_id: number; weight: number };
  type BackgroundDraft = { race_id: number; background_id: number; sort_order: number };

  type Props = {
    region: Region;
    cultures: Race[];
    backgrounds: Background[];
    onSaved: () => void | Promise<void>;
    onDeleted?: () => void | Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
  };

  let { region, cultures, backgrounds, onSaved, onDeleted, onDirtyChange }: Props = $props();

  const cultureSummary = $derived(
    region.cultures.map((c) => ({
      slug: c.race_slug,
      label: c.race_label,
      detail: `weight ${c.weight}`,
    })),
  );

  let enLabel = $state("");
  let enDesc = $state("");
  let enComment = $state("");
  let enSort = $state(0);
  let cultureRows = $state<CultureDraft[]>([]);
  let backgroundRows = $state<BackgroundDraft[]>([]);
  let addCultureId = $state<number | "">("");
  let addBgCultureId = $state<number | "">("");
  let addBgId = $state<number | "">("");
  let ruLabel = $state("");
  let ruDesc = $state("");
  let status = $state("");
  let error = $state(false);

  type Baseline = {
    enLabel: string;
    enComment: string;
    enSort: number;
    cultureRows: CultureDraft[];
    backgroundRows: BackgroundDraft[];
    ruLabel: string;
  };

  let baseline = $state<Baseline>({
    enLabel: "",
    enComment: "",
    enSort: 0,
    cultureRows: [],
    backgroundRows: [],
    ruLabel: "",
  });

  function serializeCultures(rows: CultureDraft[]): string {
    return JSON.stringify(
      [...rows]
        .map((r) => ({ race_id: r.race_id, weight: Number(r.weight) }))
        .sort((a, b) => a.race_id - b.race_id),
    );
  }

  function serializeBackgrounds(rows: BackgroundDraft[]): string {
    return JSON.stringify(
      [...rows]
        .map((r) => ({
          race_id: r.race_id,
          background_id: r.background_id,
          sort_order: Number(r.sort_order),
        }))
        .sort(
          (a, b) =>
            a.race_id - b.race_id ||
            a.sort_order - b.sort_order ||
            a.background_id - b.background_id,
        ),
    );
  }

  function snapshotFromProps(): Baseline {
    return {
      enLabel: region.label,
      enComment: region.comment ?? "",
      enSort: region.sort_order,
      cultureRows: region.cultures.map((c) => ({ race_id: c.race_id, weight: c.weight })),
      backgroundRows: region.backgrounds.map((b) => ({
        race_id: b.race_id,
        background_id: b.background_id,
        sort_order: b.sort_order,
      })),
      ruLabel: region.translations?.label ?? "",
    };
  }

  function applyBaseline(b: Baseline) {
    enLabel = b.enLabel;
    enComment = b.enComment;
    enSort = b.enSort;
    cultureRows = b.cultureRows.map((r) => ({ ...r }));
    backgroundRows = b.backgroundRows.map((r) => ({ ...r }));
    ruLabel = b.ruLabel;
  }

  function resetFromProps() {
    const b = snapshotFromProps();
    baseline = {
      ...b,
      cultureRows: b.cultureRows.map((r) => ({ ...r })),
      backgroundRows: b.backgroundRows.map((r) => ({ ...r })),
    };
    applyBaseline(baseline);
    enDesc = region.description ?? "";
    ruDesc = region.translations?.description ?? "";
    addCultureId = "";
    addBgCultureId = "";
    addBgId = "";
    status = "";
    error = false;
  }

  $effect(() => {
    void region.id;
    untrack(() => resetFromProps());
  });

  const dirty = $derived(
    enLabel !== baseline.enLabel ||
      enComment !== baseline.enComment ||
      enSort !== baseline.enSort ||
      serializeCultures(cultureRows) !== serializeCultures(baseline.cultureRows) ||
      serializeBackgrounds(backgroundRows) !== serializeBackgrounds(baseline.backgroundRows) ||
      ruLabel !== baseline.ruLabel,
  );

  $effect(() => {
    onDirtyChange?.(dirty);
  });

  onDestroy(() => {
    onDirtyChange?.(false);
  });

  $effect(() => {
    if (!dirty) return;
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      ev.preventDefault();
      ev.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  });

  function cultureLabel(raceId: number): string {
    const fromList = cultures.find((c) => c.id === raceId);
    if (fromList) return fromList.label;
    const fromRegion = region.cultures.find((c) => c.race_id === raceId);
    return fromRegion?.race_label ?? String(raceId);
  }

  function backgroundLabel(bgId: number): string {
    const fromList = backgrounds.find((b) => b.id === bgId);
    if (fromList) return fromList.label;
    const fromRegion = region.backgrounds.find((b) => b.background_id === bgId);
    return fromRegion?.background_label ?? String(bgId);
  }

  function availableCulturesToAdd(): Race[] {
    const used = new Set(cultureRows.map((r) => r.race_id));
    return cultures.filter((c) => !used.has(c.id));
  }

  function addCulture() {
    if (addCultureId === "") return;
    const id = Number(addCultureId);
    if (cultureRows.some((r) => r.race_id === id)) return;
    cultureRows = [...cultureRows, { race_id: id, weight: 1 }];
    addCultureId = "";
  }

  function removeCulture(raceId: number) {
    cultureRows = cultureRows.filter((r) => r.race_id !== raceId);
    backgroundRows = backgroundRows.filter((r) => r.race_id !== raceId);
  }

  function addBackground() {
    if (addBgCultureId === "" || addBgId === "") return;
    const raceId = Number(addBgCultureId);
    const bgId = Number(addBgId);
    if (!cultureRows.some((c) => c.race_id === raceId)) return;
    const sameCulture = backgroundRows.filter((r) => r.race_id === raceId);
    if (sameCulture.some((r) => r.background_id === bgId)) return;
    const nextOrder =
      sameCulture.length === 0 ? 0 : Math.max(...sameCulture.map((r) => r.sort_order)) + 1;
    backgroundRows = [
      ...backgroundRows,
      { race_id: raceId, background_id: bgId, sort_order: nextOrder },
    ];
    addBgId = "";
  }

  function removeBackground(raceId: number, backgroundId: number) {
    backgroundRows = backgroundRows.filter(
      (r) => !(r.race_id === raceId && r.background_id === backgroundId),
    );
  }

  function moveBackground(raceId: number, backgroundId: number, dir: -1 | 1) {
    const group = backgroundRows
      .filter((r) => r.race_id === raceId)
      .sort((a, b) => a.sort_order - b.sort_order || a.background_id - b.background_id);
    const idx = group.findIndex((r) => r.background_id === backgroundId);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= group.length) return;
    const a = group[idx]!;
    const b = group[swapIdx]!;
    const tmp = a.sort_order;
    a.sort_order = b.sort_order;
    b.sort_order = tmp;
    backgroundRows = backgroundRows.map((r) => {
      if (r.race_id === raceId && r.background_id === a.background_id) {
        return { ...r, sort_order: a.sort_order };
      }
      if (r.race_id === raceId && r.background_id === b.background_id) {
        return { ...r, sort_order: b.sort_order };
      }
      return r;
    });
  }

  function backgroundsForCulture(raceId: number): BackgroundDraft[] {
    return backgroundRows
      .filter((r) => r.race_id === raceId)
      .sort((a, b) => a.sort_order - b.sort_order || a.background_id - b.background_id);
  }

  function availableBackgrounds(raceId: number): Background[] {
    const used = new Set(
      backgroundRows.filter((r) => r.race_id === raceId).map((r) => r.background_id),
    );
    return backgrounds.filter((b) => !used.has(b.id));
  }

  function toCultureIn(): RegionCultureIn[] {
    return cultureRows.map((r) => ({ race_id: r.race_id, weight: Number(r.weight) }));
  }

  function toBackgroundIn(): RegionBackgroundIn[] {
    return backgroundRows.map((r) => ({
      race_id: r.race_id,
      background_id: r.background_id,
      sort_order: Number(r.sort_order),
    }));
  }

  async function saveOverlay(field: TranslationField, value: string) {
    const trimmed = value.trim();
    if (trimmed === "") {
      await api.deleteTranslation({
        entity_kind: "region",
        entity_id: region.id,
        locale: "ru",
        field,
      });
      return;
    }
    await api.putTranslation({
      entity_kind: "region",
      entity_id: region.id,
      locale: "ru",
      field,
      value: trimmed,
    });
  }

  async function save() {
    if (!dirty) return;
    status = "Saving…";
    error = false;
    try {
      await api.patchRegion(region.id, {
        label: enLabel,
        description: enDesc,
        comment: enComment,
        sort_order: enSort,
        cultures: toCultureIn(),
        backgrounds: toBackgroundIn(),
      });
      await saveOverlay("label", ruLabel);
      status = "Saved";
      await onSaved();
      baseline = {
        enLabel,
        enComment,
        enSort,
        cultureRows: cultureRows.map((r) => ({ ...r })),
        backgroundRows: backgroundRows.map((r) => ({ ...r })),
        ruLabel,
      };
    } catch (e) {
      error = true;
      status = e instanceof Error ? e.message : String(e);
    }
  }

  function cancel() {
    applyBaseline(baseline);
    status = "";
    error = false;
  }

  async function saveEnDescription(markdown: string) {
    await api.patchRegion(region.id, {
      label: region.label,
      description: markdown,
      comment: region.comment,
      sort_order: region.sort_order,
      cultures: region.cultures.map((c) => ({ race_id: c.race_id, weight: c.weight })),
      backgrounds: region.backgrounds.map((b) => ({
        race_id: b.race_id,
        background_id: b.background_id,
        sort_order: b.sort_order,
      })),
    });
    enDesc = markdown;
    await onSaved();
  }

  async function saveRuDescription(markdown: string) {
    await saveOverlay("description", markdown);
    ruDesc = markdown;
    await onSaved();
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete region “${region.label}”? This removes its culture and background assignments.`,
      )
    ) {
      return;
    }
    error = false;
    status = "Deleting…";
    try {
      await api.deleteRegion(region.id);
      status = "Deleted";
      await onDeleted?.();
    } catch (e) {
      error = true;
      status = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<div class="forge-panel p-3">
  <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
    <div>
      <p class="font-display text-2xl leading-none text-ink">{enLabel || region.slug}</p>
      <p class="mt-0.5 font-mono text-xs text-muted">
        {region.slug} · region #{region.id}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <button type="button" class="forge-btn text-danger" onclick={() => void remove()}>Delete</button>
      <button type="button" class="forge-btn" disabled={!dirty} onclick={cancel}>Cancel</button>
      <button
        type="button"
        class="forge-btn forge-btn-primary"
        disabled={!dirty}
        onclick={() => void save()}>Save</button
      >
      {#if status}
        <span class="text-sm {error ? 'text-danger' : 'text-ok'}">{status}</span>
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3">
    <section>
      <h3 class="mb-2 font-display text-lg text-ink">English</h3>
      <div class="forge-field">
        <label for="region-en-label">Label</label>
        <input id="region-en-label" class="forge-input" bind:value={enLabel} />
      </div>
      {#key `region-en-desc-${region.id}`}
        <RichTextField
          label="Description"
          value={enDesc}
          placeholder="(no description yet)"
          onSave={saveEnDescription}
        />
      {/key}
      <div class="forge-field">
        <label for="region-sort">Sort order</label>
        <input id="region-sort" class="forge-input max-w-32" type="number" bind:value={enSort} />
      </div>
    </section>

    <section>
      <h3 class="mb-2 font-display text-lg text-ink">Русский</h3>
      <div class="forge-field">
        <label for="region-ru-label">Label</label>
        <input
          id="region-ru-label"
          class="forge-input"
          bind:value={ruLabel}
          placeholder="(empty = fall back to English)"
        />
      </div>
      {#key `region-ru-desc-${region.id}`}
        <RichTextField
          label="Description"
          value={ruDesc}
          placeholder="(empty = fall back to English)"
          onSave={saveRuDescription}
        />
      {/key}
    </section>
  </div>

  <div class="mt-3 border-t border-line pt-3">
    <h3 class="mb-2 font-display text-lg text-ink">Culture weights</h3>
    <div class="mb-2 flex flex-wrap items-end gap-2">
      <div class="forge-field mb-0 min-w-56 flex-1">
        <label for="region-add-culture">Add culture</label>
        <select id="region-add-culture" class="forge-input" bind:value={addCultureId}>
          <option value="">Select…</option>
          {#each availableCulturesToAdd() as c (c.id)}
            <option value={c.id}>{c.label} ({c.slug})</option>
          {/each}
        </select>
      </div>
      <button type="button" class="forge-btn" disabled={addCultureId === ""} onclick={addCulture}
        >Add</button
      >
    </div>
    {#if cultureRows.length === 0}
      <p class="text-sm text-muted">No cultures assigned yet.</p>
    {:else}
      <div class="flex flex-col gap-1">
        {#each cultureRows as row (row.race_id)}
          <div
            class="flex flex-wrap items-center gap-2 rounded-md border border-line px-2.5 py-1.5"
          >
            <span class="min-w-40 flex-1 text-sm">{cultureLabel(row.race_id)}</span>
            <label class="flex items-center gap-1 text-xs text-muted">
              Weight
              <input class="forge-input w-20 py-1" type="number" min="1" bind:value={row.weight} />
            </label>
            <button type="button" class="forge-btn py-1" onclick={() => removeCulture(row.race_id)}
              >Remove</button
            >
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="mt-3 border-t border-line pt-3">
    <h3 class="mb-2 font-display text-lg text-ink">Background assignments</h3>
    <p class="mb-2 text-sm text-muted">
      Ordered backgrounds per culture in this region. Add cultures above first.
    </p>
    <div class="mb-2 flex flex-wrap items-end gap-2">
      <div class="forge-field mb-0 min-w-40 flex-1">
        <label for="region-bg-culture">Culture</label>
        <select
          id="region-bg-culture"
          class="forge-input"
          bind:value={addBgCultureId}
          onchange={() => {
            addBgId = "";
          }}
        >
          <option value="">Select…</option>
          {#each cultureRows as c (c.race_id)}
            <option value={c.race_id}>{cultureLabel(c.race_id)}</option>
          {/each}
        </select>
      </div>
      <div class="forge-field mb-0 min-w-40 flex-1">
        <label for="region-bg-id">Background</label>
        <select
          id="region-bg-id"
          class="forge-input"
          bind:value={addBgId}
          disabled={addBgCultureId === ""}
        >
          <option value="">Select…</option>
          {#if addBgCultureId !== ""}
            {#each availableBackgrounds(Number(addBgCultureId)) as b (b.id)}
              <option value={b.id}>{b.label} ({b.slug})</option>
            {/each}
          {/if}
        </select>
      </div>
      <button
        type="button"
        class="forge-btn"
        disabled={addBgCultureId === "" || addBgId === ""}
        onclick={addBackground}>Add</button
      >
    </div>

    {#each cultureRows as c (c.race_id)}
      {@const rows = backgroundsForCulture(c.race_id)}
      <div class="mb-2 rounded-md border border-line p-2">
        <p class="mb-1 text-sm font-medium">{cultureLabel(c.race_id)}</p>
        {#if rows.length === 0}
          <p class="text-xs text-muted">No backgrounds.</p>
        {:else}
          <div class="flex flex-col gap-0.5">
            {#each rows as row, i (row.background_id)}
              <div class="flex flex-wrap items-center gap-2 px-1 py-0.5 text-sm">
                <span class="font-mono text-xs text-muted w-6">{i + 1}.</span>
                <span class="min-w-32 flex-1">{backgroundLabel(row.background_id)}</span>
                <button
                  type="button"
                  class="forge-btn py-0.5 text-xs"
                  disabled={i === 0}
                  onclick={() => moveBackground(row.race_id, row.background_id, -1)}>↑</button
                >
                <button
                  type="button"
                  class="forge-btn py-0.5 text-xs"
                  disabled={i === rows.length - 1}
                  onclick={() => moveBackground(row.race_id, row.background_id, 1)}>↓</button
                >
                <button
                  type="button"
                  class="forge-btn py-0.5 text-xs"
                  onclick={() => removeBackground(row.race_id, row.background_id)}>Remove</button
                >
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="mt-2 border-t border-line pt-3">
    <div class="forge-field mb-0">
      <label for="region-comment"
        >Comment <span class="normal-case tracking-normal text-muted">(all languages)</span></label
      >
      <textarea
        id="region-comment"
        class="forge-input min-h-16 resize-y"
        bind:value={enComment}
        placeholder="Author notes — not translated, not shown in play"></textarea>
    </div>
  </div>

  <LinkPanel title="Cultures summary" links={cultureSummary} empty="No cultures assigned." />
</div>
