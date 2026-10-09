<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import {
    api,
    type Background,
    type ClassRow,
    type Race,
    type Region,
    type Talent,
    type TranslationField,
  } from "$lib/api";
  import RichTextField from "$lib/RichTextField.svelte";

  type RegionDraft = { region_id: number; weight: number };
  type BgDraft = { region_id: number; background_id: number; sort_order: number };

  type Props = {
    culture: Race;
    talents: Talent[];
    classes: ClassRow[];
    regions: Region[];
    backgrounds: Background[];
    onSaved: () => void | Promise<void>;
    onDeleted?: () => void | Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
  };

  let {
    culture,
    talents,
    classes,
    regions,
    backgrounds,
    onSaved,
    onDeleted,
    onDirtyChange,
  }: Props = $props();

  let enLabel = $state("");
  let enDesc = $state("");
  let enComment = $state("");
  let enSort = $state(0);
  let talentId = $state(0);
  let classIds = $state<number[]>([]);
  let regionRows = $state<RegionDraft[]>([]);
  let backgroundRows = $state<BgDraft[]>([]);
  let addRegionId = $state<number | "">("");
  let addBgRegionId = $state<number | "">("");
  let addBgId = $state<number | "">("");
  let ruLabel = $state("");
  let ruDesc = $state("");
  let status = $state("");
  let error = $state(false);

  type Baseline = {
    enLabel: string;
    enComment: string;
    enSort: number;
    talentId: number;
    classIds: number[];
    regionRows: RegionDraft[];
    backgroundRows: BgDraft[];
    ruLabel: string;
  };

  let baseline = $state<Baseline>({
    enLabel: "",
    enComment: "",
    enSort: 0,
    talentId: 0,
    classIds: [],
    regionRows: [],
    backgroundRows: [],
    ruLabel: "",
  });

  function snapshotFromProps(): Baseline {
    return {
      enLabel: culture.label,
      enComment: culture.comment ?? "",
      enSort: culture.sort_order,
      talentId: culture.talent_id ?? 0,
      classIds: [...culture.classes.map((c) => c.class_id)].sort((a, b) => a - b),
      regionRows: (culture.linked_regions ?? []).map((r) => ({
        region_id: r.region_id,
        weight: r.weight,
      })),
      backgroundRows: (culture.linked_backgrounds ?? []).map((b) => ({
        region_id: b.region_id,
        background_id: b.background_id,
        sort_order: b.sort_order,
      })),
      ruLabel: culture.translations?.label ?? "",
    };
  }

  function applyBaseline(b: Baseline) {
    enLabel = b.enLabel;
    enComment = b.enComment;
    enSort = b.enSort;
    talentId = b.talentId;
    classIds = [...b.classIds];
    regionRows = b.regionRows.map((r) => ({ ...r }));
    backgroundRows = b.backgroundRows.map((r) => ({ ...r }));
    ruLabel = b.ruLabel;
    addRegionId = "";
    addBgRegionId = "";
    addBgId = "";
  }

  function resetFromProps() {
    const b = snapshotFromProps();
    baseline = b;
    applyBaseline(b);
    enDesc = culture.description ?? "";
    ruDesc = culture.translations?.description ?? "";
    status = "";
    error = false;
  }

  $effect(() => {
    void culture.id;
    untrack(() => resetFromProps());
  });

  function classIdsEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  function regionRowsEqual(a: RegionDraft[], b: RegionDraft[]): boolean {
    if (a.length !== b.length) return false;
    const sa = [...a].sort((x, y) => x.region_id - y.region_id);
    const sb = [...b].sort((x, y) => x.region_id - y.region_id);
    return sa.every(
      (r, i) => r.region_id === sb[i]!.region_id && Number(r.weight) === Number(sb[i]!.weight),
    );
  }

  function bgRowsEqual(a: BgDraft[], b: BgDraft[]): boolean {
    if (a.length !== b.length) return false;
    const key = (r: BgDraft) => `${r.region_id}:${r.background_id}:${r.sort_order}`;
    const sa = [...a].map(key).sort();
    const sb = [...b].map(key).sort();
    return sa.every((v, i) => v === sb[i]);
  }

  const dirty = $derived(
    enLabel !== baseline.enLabel ||
      enComment !== baseline.enComment ||
      enSort !== baseline.enSort ||
      talentId !== baseline.talentId ||
      !classIdsEqual(
        [...classIds].sort((a, b) => a - b),
        baseline.classIds,
      ) ||
      !regionRowsEqual(regionRows, baseline.regionRows) ||
      !bgRowsEqual(backgroundRows, baseline.backgroundRows) ||
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

  function toggleClass(id: number) {
    if (classIds.includes(id)) {
      classIds = classIds.filter((x) => x !== id);
    } else {
      classIds = [...classIds, id];
    }
  }

  function talentPayload(): number | null {
    return talentId > 0 ? Number(talentId) : null;
  }

  function regionLabel(id: number): string {
    return regions.find((r) => r.id === id)?.label ?? culture.linked_regions.find((r) => r.region_id === id)?.region_label ?? `#${id}`;
  }

  function backgroundLabel(id: number): string {
    return (
      backgrounds.find((b) => b.id === id)?.label ??
      culture.linked_backgrounds.find((b) => b.background_id === id)?.background_label ??
      `#${id}`
    );
  }

  function availableRegionsToAdd(): Region[] {
    const used = new Set(regionRows.map((r) => r.region_id));
    return regions.filter((r) => !used.has(r.id));
  }

  function addRegion() {
    if (addRegionId === "") return;
    const id = Number(addRegionId);
    regionRows = [...regionRows, { region_id: id, weight: 1 }];
    addRegionId = "";
  }

  function removeRegion(regionId: number) {
    regionRows = regionRows.filter((r) => r.region_id !== regionId);
    backgroundRows = backgroundRows.filter((b) => b.region_id !== regionId);
    if (addBgRegionId === regionId) {
      addBgRegionId = "";
      addBgId = "";
    }
  }

  function backgroundsForRegion(regionId: number): BgDraft[] {
    return [...backgroundRows.filter((b) => b.region_id === regionId)].sort(
      (a, b) => a.sort_order - b.sort_order || a.background_id - b.background_id,
    );
  }

  function availableBackgrounds(regionId: number): Background[] {
    const used = new Set(
      backgroundRows.filter((b) => b.region_id === regionId).map((b) => b.background_id),
    );
    return backgrounds.filter((b) => !used.has(b.id));
  }

  function reindexRegionBackgrounds(regionId: number, rows: BgDraft[]) {
    const others = backgroundRows.filter((b) => b.region_id !== regionId);
    backgroundRows = [
      ...others,
      ...rows.map((r, i) => ({ ...r, region_id: regionId, sort_order: i })),
    ];
  }

  function addBackground() {
    if (addBgRegionId === "" || addBgId === "") return;
    const regionId = Number(addBgRegionId);
    const bgId = Number(addBgId);
    const existing = backgroundsForRegion(regionId);
    reindexRegionBackgrounds(regionId, [
      ...existing,
      { region_id: regionId, background_id: bgId, sort_order: existing.length },
    ]);
    addBgId = "";
  }

  function removeBackground(regionId: number, backgroundId: number) {
    reindexRegionBackgrounds(
      regionId,
      backgroundsForRegion(regionId).filter((b) => b.background_id !== backgroundId),
    );
  }

  function moveBackground(regionId: number, backgroundId: number, delta: -1 | 1) {
    const rows = backgroundsForRegion(regionId);
    const i = rows.findIndex((b) => b.background_id === backgroundId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const next = [...rows];
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
    reindexRegionBackgrounds(regionId, next);
  }

  function toRegionsIn() {
    return regionRows.map((r) => ({
      region_id: r.region_id,
      weight: Math.max(1, Number(r.weight) || 1),
    }));
  }

  function toPlacementsIn() {
    return regionRows.flatMap((r) =>
      backgroundsForRegion(r.region_id).map((b, i) => ({
        region_id: r.region_id,
        background_id: b.background_id,
        sort_order: i,
      })),
    );
  }

  function propsLinkPayload() {
    return {
      regions: (culture.linked_regions ?? []).map((r) => ({
        region_id: r.region_id,
        weight: r.weight,
      })),
      background_placements: (culture.linked_backgrounds ?? []).map((b) => ({
        region_id: b.region_id,
        background_id: b.background_id,
        sort_order: b.sort_order,
      })),
    };
  }

  async function saveOverlay(field: TranslationField, value: string) {
    const trimmed = value.trim();
    if (trimmed === "") {
      await api.deleteTranslation({
        entity_kind: "race",
        entity_id: culture.id,
        locale: "ru",
        field,
      });
      return;
    }
    await api.putTranslation({
      entity_kind: "race",
      entity_id: culture.id,
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
      await api.patchRace(culture.id, {
        label: enLabel,
        description: enDesc,
        comment: enComment,
        talent_id: talentPayload(),
        sort_order: enSort,
        class_ids: classIds,
        regions: toRegionsIn(),
        background_placements: toPlacementsIn(),
      });
      await saveOverlay("label", ruLabel);
      status = "Saved";
      await onSaved();
      baseline = {
        enLabel,
        enComment,
        enSort,
        talentId,
        classIds: [...classIds].sort((a, b) => a - b),
        regionRows: toRegionsIn(),
        backgroundRows: toPlacementsIn(),
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
    const links = propsLinkPayload();
    await api.patchRace(culture.id, {
      label: culture.label,
      description: markdown,
      comment: culture.comment,
      talent_id: culture.talent_id,
      sort_order: culture.sort_order,
      class_ids: culture.classes.map((c) => c.class_id),
      regions: links.regions,
      background_placements: links.background_placements,
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
    if (!window.confirm(`Delete culture “${culture.label}”?`)) return;
    error = false;
    status = "Deleting…";
    try {
      await api.deleteRace(culture.id);
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
      <p class="font-display text-2xl leading-none text-ink">{enLabel || culture.slug}</p>
      <p class="mt-0.5 font-mono text-xs text-muted">
        {culture.slug} · culture #{culture.id}
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
        <label for="culture-en-label">Label</label>
        <input id="culture-en-label" class="forge-input" bind:value={enLabel} />
      </div>
      {#key `culture-en-desc-${culture.id}`}
        <RichTextField
          label="Description"
          value={enDesc}
          placeholder="(no description yet)"
          onSave={saveEnDescription}
        />
      {/key}
      <div class="forge-field">
        <label for="culture-talent">Talent</label>
        <select id="culture-talent" class="forge-input" bind:value={talentId}>
          <option value={0}>(none)</option>
          {#each talents as t (t.id)}
            <option value={t.id}>{t.label} ({t.slug})</option>
          {/each}
        </select>
      </div>
      <div class="forge-field">
        <label for="culture-sort">Sort order</label>
        <input id="culture-sort" class="forge-input max-w-32" type="number" bind:value={enSort} />
      </div>
      <fieldset class="forge-field">
        <legend class="text-xs font-medium tracking-wide text-muted uppercase"
          >Allowed classes</legend
        >
        <div
          class="mt-1 flex max-h-48 flex-col gap-0.5 overflow-auto rounded-md border border-line p-2"
        >
          {#each classes as c (c.id)}
            <label class="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={classIds.includes(c.id)}
                onchange={() => toggleClass(c.id)}
              />
              <span>{c.label}</span>
              <span class="font-mono text-xs text-muted">{c.slug}</span>
            </label>
          {/each}
        </div>
      </fieldset>
    </section>

    <section>
      <h3 class="mb-2 font-display text-lg text-ink">Русский</h3>
      <div class="forge-field">
        <label for="culture-ru-label">Label</label>
        <input
          id="culture-ru-label"
          class="forge-input"
          bind:value={ruLabel}
          placeholder="(empty = fall back to English)"
        />
      </div>
      {#key `culture-ru-desc-${culture.id}`}
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
    <h3 class="mb-2 font-display text-lg text-ink">Regions</h3>
    <p class="mb-2 text-sm text-muted">Where this culture appears, with roll weight.</p>
    <div class="mb-2 flex flex-wrap items-end gap-2">
      <div class="forge-field mb-0 min-w-56 flex-1">
        <label for="culture-add-region">Add region</label>
        <select id="culture-add-region" class="forge-input" bind:value={addRegionId}>
          <option value="">Select…</option>
          {#each availableRegionsToAdd() as r (r.id)}
            <option value={r.id}>{r.label} ({r.slug})</option>
          {/each}
        </select>
      </div>
      <button type="button" class="forge-btn" disabled={addRegionId === ""} onclick={addRegion}
        >Add</button
      >
    </div>
    {#if regionRows.length === 0}
      <p class="text-sm text-muted">Not assigned to any region.</p>
    {:else}
      <div class="flex flex-col gap-1">
        {#each regionRows as row (row.region_id)}
          <div
            class="flex flex-wrap items-center gap-2 rounded-md border border-line px-2.5 py-1.5"
          >
            <span class="min-w-40 flex-1 text-sm">{regionLabel(row.region_id)}</span>
            <label class="flex items-center gap-1 text-xs text-muted">
              Weight
              <input class="forge-input w-20 py-1" type="number" min="1" bind:value={row.weight} />
            </label>
            <button type="button" class="forge-btn py-1" onclick={() => removeRegion(row.region_id)}
              >Remove</button
            >
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="mt-3 border-t border-line pt-3">
    <h3 class="mb-2 font-display text-lg text-ink">Backgrounds by region</h3>
    <p class="mb-2 text-sm text-muted">
      Ordered backgrounds for this culture in each region. Add regions above first.
    </p>
    <div class="mb-2 flex flex-wrap items-end gap-2">
      <div class="forge-field mb-0 min-w-40 flex-1">
        <label for="culture-bg-region">Region</label>
        <select
          id="culture-bg-region"
          class="forge-input"
          bind:value={addBgRegionId}
          onchange={() => {
            addBgId = "";
          }}
        >
          <option value="">Select…</option>
          {#each regionRows as r (r.region_id)}
            <option value={r.region_id}>{regionLabel(r.region_id)}</option>
          {/each}
        </select>
      </div>
      <div class="forge-field mb-0 min-w-40 flex-1">
        <label for="culture-bg-id">Background</label>
        <select
          id="culture-bg-id"
          class="forge-input"
          bind:value={addBgId}
          disabled={addBgRegionId === ""}
        >
          <option value="">Select…</option>
          {#if addBgRegionId !== ""}
            {#each availableBackgrounds(Number(addBgRegionId)) as b (b.id)}
              <option value={b.id}>{b.label} ({b.slug})</option>
            {/each}
          {/if}
        </select>
      </div>
      <button
        type="button"
        class="forge-btn"
        disabled={addBgRegionId === "" || addBgId === ""}
        onclick={addBackground}>Add</button
      >
    </div>

    {#each regionRows as r (r.region_id)}
      {@const rows = backgroundsForRegion(r.region_id)}
      <div class="mb-2 rounded-md border border-line p-2">
        <p class="mb-1 text-sm font-medium">{regionLabel(r.region_id)}</p>
        {#if rows.length === 0}
          <p class="text-xs text-muted">No backgrounds.</p>
        {:else}
          <div class="flex flex-col gap-0.5">
            {#each rows as row, i (row.background_id)}
              <div class="flex flex-wrap items-center gap-2 px-1 py-0.5 text-sm">
                <span class="w-6 font-mono text-xs text-muted">{i + 1}.</span>
                <span class="min-w-32 flex-1">{backgroundLabel(row.background_id)}</span>
                <button
                  type="button"
                  class="forge-btn py-0.5 text-xs"
                  disabled={i === 0}
                  onclick={() => moveBackground(row.region_id, row.background_id, -1)}>↑</button
                >
                <button
                  type="button"
                  class="forge-btn py-0.5 text-xs"
                  disabled={i === rows.length - 1}
                  onclick={() => moveBackground(row.region_id, row.background_id, 1)}>↓</button
                >
                <button
                  type="button"
                  class="forge-btn py-0.5 text-xs"
                  onclick={() => removeBackground(row.region_id, row.background_id)}>Remove</button
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
      <label for="culture-comment"
        >Comment <span class="normal-case tracking-normal text-muted">(all languages)</span></label
      >
      <textarea
        id="culture-comment"
        class="forge-input min-h-16 resize-y"
        bind:value={enComment}
        placeholder="Author notes — not translated, not shown in play"></textarea>
    </div>
  </div>
</div>
