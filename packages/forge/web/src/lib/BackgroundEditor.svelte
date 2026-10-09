<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import {
    api,
    type Background,
    type GrantKind,
    type GrowthRowIn,
    type Race,
    type Region,
    type Skill,
    type Specialization,
    type TranslationField,
  } from "$lib/api";
  import RichTextField from "$lib/RichTextField.svelte";
  import LinkPanel from "$lib/LinkPanel.svelte";

  type UseDraft = { region_id: number; race_id: number; sort_order: number };

  type SpecMode = "none" | "fixed" | "free" | "parameterized" | string;

  /** Select value: skill id as string, or anyCombat / anySkill. */
  type GrantPick = string;

  type GrowthDraft = {
    roll_index: number;
    pick: GrantPick;
    specialization_id: number;
    specialization_label: string;
  };

  type Props = {
    background: Background;
    skills: Skill[];
    specsBySkill: Record<number, Specialization[]>;
    loadSpecs: (skillId: number) => Promise<void>;
    regions: Region[];
    cultures: Race[];
    onSaved: () => void | Promise<void>;
    onDeleted?: () => void | Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
  };

  let {
    background,
    skills,
    specsBySkill,
    loadSpecs,
    regions,
    cultures,
    onSaved,
    onDeleted,
    onDirtyChange,
  }: Props = $props();
  const freeSkillLinks = $derived.by(() => {
    const kind = background.free_grant_kind || "skill";
    if (kind === "anyCombat") {
      return [{ slug: "anyCombat", label: "Any combat" }];
    }
    if (kind === "anySkill") {
      return [{ slug: "anySkill", label: "Any" }];
    }
    if (!background.free_skill_slug) return [] as { slug: string; label: string; detail?: string }[];
    const link: { slug: string; label: string; detail?: string } = {
      slug: background.free_skill_slug,
      label:
        skills.find((s) => s.id === background.free_skill_id)?.label ?? background.free_skill_slug,
    };
    const detail =
      background.free_specialization_label?.trim() ||
      background.free_specialization_slug ||
      "";
    if (detail) link.detail = detail;
    return [link];
  });

  let enLabel = $state("");
  let enDesc = $state("");
  let enComment = $state("");
  let enSort = $state(0);
  let freePick = $state<GrantPick>("0");
  let freeSpecId = $state(0);
  let freeSpecLabel = $state("");
  let growth = $state<GrowthDraft[]>([]);
  let usedByRows = $state<UseDraft[]>([]);
  let addUseRegionId = $state<number | "">("");
  let addUseCultureId = $state<number | "">("");
  let ruLabel = $state("");
  let ruDesc = $state("");
  let status = $state("");
  let error = $state(false);

  type Baseline = {
    enLabel: string;
    enComment: string;
    enSort: number;
    freePick: GrantPick;
    freeSpecId: number;
    freeSpecLabel: string;
    growth: GrowthDraft[];
    usedByRows: UseDraft[];
    ruLabel: string;
  };

  let baseline = $state<Baseline>({
    enLabel: "",
    enComment: "",
    enSort: 0,
    freePick: "0",
    freeSpecId: 0,
    freeSpecLabel: "",
    growth: [],
    usedByRows: [],
    ruLabel: "",
  });

  function isWildcard(pick: GrantPick): boolean {
    return pick === "anyCombat" || pick === "anySkill";
  }

  function pickKind(pick: GrantPick): GrantKind {
    if (pick === "anyCombat") return "anyCombat";
    if (pick === "anySkill") return "anySkill";
    return "skill";
  }

  function pickSkillId(pick: GrantPick): number {
    if (isWildcard(pick)) return 0;
    return Number(pick) || 0;
  }

  function entityToPick(kind: string | undefined, skillId: number | null | undefined): GrantPick {
    if (kind === "anyCombat" || kind === "anySkill") return kind;
    if (skillId && skillId > 0) return String(skillId);
    return skills[0] ? String(skills[0].id) : "0";
  }

  function skillMode(skillId: number): SpecMode {
    if (skillId <= 0) return "none";
    return skills.find((s) => s.id === Number(skillId))?.specialization_mode ?? "none";
  }

  function showsCatalog(mode: SpecMode): boolean {
    return mode === "fixed" || mode === "parameterized";
  }

  function showsFreeform(mode: SpecMode): boolean {
    return mode === "free" || mode === "parameterized";
  }

  function serializeGrowth(rows: GrowthDraft[]): string {
    return JSON.stringify(
      rows.map((r) => ({
        roll_index: r.roll_index,
        pick: r.pick,
        specialization_id: Number(r.specialization_id) > 0 ? Number(r.specialization_id) : null,
        specialization_label: r.specialization_label.trim(),
      })),
    );
  }

  function growthFromEntity(bg: Background): GrowthDraft[] {
    const byIndex = new Map(bg.growth.map((g) => [g.roll_index, g]));
    const rows: GrowthDraft[] = [];
    for (let i = 1; i <= 8; i++) {
      const g = byIndex.get(i);
      rows.push({
        roll_index: i,
        pick: entityToPick(g?.grant_kind, g?.skill_id),
        specialization_id: g?.specialization_id ?? 0,
        specialization_label: g?.specialization_label ?? "",
      });
    }
    return rows;
  }

  function snapshotFromProps(): Baseline {
    return {
      enLabel: background.label,
      enComment: background.comment ?? "",
      enSort: background.sort_order,
      freePick: entityToPick(background.free_grant_kind, background.free_skill_id),
      freeSpecId: background.free_specialization_id ?? 0,
      freeSpecLabel: background.free_specialization_label ?? "",
      growth: growthFromEntity(background),
      usedByRows: (background.used_by ?? []).map((u) => ({
        region_id: u.region_id,
        race_id: u.race_id,
        sort_order: u.sort_order,
      })),
      ruLabel: background.translations?.label ?? "",
    };
  }

  function applyBaseline(b: Baseline) {
    enLabel = b.enLabel;
    enComment = b.enComment;
    enSort = b.enSort;
    freePick = b.freePick;
    freeSpecId = b.freeSpecId;
    freeSpecLabel = b.freeSpecLabel;
    growth = b.growth.map((r) => ({ ...r }));
    usedByRows = b.usedByRows.map((r) => ({ ...r }));
    ruLabel = b.ruLabel;
    addUseRegionId = "";
    addUseCultureId = "";
  }

  function usedByEqual(a: UseDraft[], b: UseDraft[]): boolean {
    if (a.length !== b.length) return false;
    const key = (r: UseDraft) => `${r.region_id}:${r.race_id}:${r.sort_order}`;
    const sa = [...a].map(key).sort();
    const sb = [...b].map(key).sort();
    return sa.every((v, i) => v === sb[i]);
  }

  function regionLabel(id: number): string {
    return (
      regions.find((r) => r.id === id)?.label ??
      background.used_by.find((u) => u.region_id === id)?.region_label ??
      `#${id}`
    );
  }

  function cultureLabel(id: number): string {
    return (
      cultures.find((c) => c.id === id)?.label ??
      background.used_by.find((u) => u.race_id === id)?.race_label ??
      `#${id}`
    );
  }

  function availableCulturesForRegion(regionId: number): Race[] {
    const used = new Set(
      usedByRows.filter((u) => u.region_id === regionId).map((u) => u.race_id),
    );
    return cultures.filter((c) => !used.has(c.id));
  }

  function nextSortForPair(regionId: number, raceId: number): number {
    let max = -1;
    for (const u of usedByRows) {
      if (u.region_id === regionId && u.race_id === raceId && u.sort_order > max) {
        max = u.sort_order;
      }
    }
    // Also respect orders already on the entity for other backgrounds in the same pair:
    // when we only edit this background's rows, append after existing used_by sort.
    for (const u of background.used_by ?? []) {
      if (u.region_id === regionId && u.race_id === raceId && u.sort_order > max) {
        max = u.sort_order;
      }
    }
    return max + 1;
  }

  function addUse() {
    if (addUseRegionId === "" || addUseCultureId === "") return;
    const regionId = Number(addUseRegionId);
    const raceId = Number(addUseCultureId);
    usedByRows = [
      ...usedByRows,
      { region_id: regionId, race_id: raceId, sort_order: nextSortForPair(regionId, raceId) },
    ];
    addUseCultureId = "";
  }

  function removeUse(regionId: number, raceId: number) {
    usedByRows = usedByRows.filter((u) => !(u.region_id === regionId && u.race_id === raceId));
  }

  function toUsedByIn(): UseDraft[] {
    return usedByRows.map((u) => ({
      region_id: u.region_id,
      race_id: u.race_id,
      sort_order: u.sort_order,
    }));
  }

  function propsUsedBy(): UseDraft[] {
    return (background.used_by ?? []).map((u) => ({
      region_id: u.region_id,
      race_id: u.race_id,
      sort_order: u.sort_order,
    }));
  }

  async function ensureSpecsForForm(b: Baseline) {
    const ids = new Set<number>([
      pickSkillId(b.freePick),
      ...b.growth.map((g) => pickSkillId(g.pick)),
    ]);
    for (const id of ids) {
      if (id > 0 && showsCatalog(skillMode(id))) await loadSpecs(id);
    }
  }

  function resetFromProps() {
    const b = snapshotFromProps();
    baseline = {
      ...b,
      growth: b.growth.map((r) => ({ ...r })),
    };
    applyBaseline(baseline);
    enDesc = background.description ?? "";
    ruDesc = background.translations?.description ?? "";
    status = "";
    error = false;
    void ensureSpecsForForm(baseline);
  }

  $effect(() => {
    void background.id;
    untrack(() => resetFromProps());
  });

  const dirty = $derived(
    enLabel !== baseline.enLabel ||
      enComment !== baseline.enComment ||
      enSort !== baseline.enSort ||
      freePick !== baseline.freePick ||
      freeSpecId !== baseline.freeSpecId ||
      freeSpecLabel !== baseline.freeSpecLabel ||
      serializeGrowth(growth) !== serializeGrowth(baseline.growth) ||
      !usedByEqual(usedByRows, baseline.usedByRows) ||
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

  function specsFor(skillId: number): Specialization[] {
    return specsBySkill[skillId] ?? [];
  }

  async function onFreePickChange() {
    freeSpecId = 0;
    freeSpecLabel = "";
    const id = pickSkillId(freePick);
    if (id > 0 && showsCatalog(skillMode(id))) await loadSpecs(id);
  }

  async function onGrowthPickChange(row: GrowthDraft) {
    row.specialization_id = 0;
    row.specialization_label = "";
    const id = pickSkillId(row.pick);
    if (id > 0 && showsCatalog(skillMode(id))) await loadSpecs(id);
  }

  function onFreeCatalogChange() {
    if (Number(freeSpecId) > 0) freeSpecLabel = "";
  }

  function onFreeLabelInput() {
    if (freeSpecLabel.trim()) freeSpecId = 0;
  }

  function onGrowthCatalogChange(row: GrowthDraft) {
    if (Number(row.specialization_id) > 0) row.specialization_label = "";
  }

  function onGrowthLabelInput(row: GrowthDraft) {
    if (row.specialization_label.trim()) row.specialization_id = 0;
  }

  function grantPayload(pick: GrantPick, specId: number, specLabel: string): {
    grant_kind: GrantKind;
    skill_id: number | null;
    specialization_id: number | null;
    specialization_label: string;
  } {
    const kind = pickKind(pick);
    if (kind !== "skill") {
      return {
        grant_kind: kind,
        skill_id: null,
        specialization_id: null,
        specialization_label: "",
      };
    }
    const skillId = pickSkillId(pick);
    const mode = skillMode(skillId);
    const id = Number(specId) > 0 ? Number(specId) : null;
    const label = specLabel.trim();
    return {
      grant_kind: "skill",
      skill_id: skillId > 0 ? skillId : null,
      specialization_id: showsCatalog(mode) ? id : null,
      specialization_label: showsFreeform(mode) ? label : "",
    };
  }

  function toGrowthIn(): GrowthRowIn[] {
    return growth.map((r) => {
      const p = grantPayload(r.pick, r.specialization_id, r.specialization_label);
      return { roll_index: r.roll_index, ...p };
    });
  }

  async function saveOverlay(field: TranslationField, value: string) {
    const trimmed = value.trim();
    if (trimmed === "") {
      await api.deleteTranslation({
        entity_kind: "background",
        entity_id: background.id,
        locale: "ru",
        field,
      });
      return;
    }
    await api.putTranslation({
      entity_kind: "background",
      entity_id: background.id,
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
      const free = grantPayload(freePick, freeSpecId, freeSpecLabel);
      await api.patchBackground(background.id, {
        label: enLabel,
        description: enDesc,
        comment: enComment,
        free_grant_kind: free.grant_kind,
        free_skill_id: free.skill_id,
        free_specialization_id: free.specialization_id,
        free_specialization_label: free.specialization_label,
        sort_order: enSort,
        growth: toGrowthIn(),
        used_by: toUsedByIn(),
      });
      await saveOverlay("label", ruLabel);
      status = "Saved";
      await onSaved();
      baseline = {
        enLabel,
        enComment,
        enSort,
        freePick,
        freeSpecId,
        freeSpecLabel,
        growth: growth.map((r) => ({ ...r })),
        usedByRows: toUsedByIn(),
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
    await api.patchBackground(background.id, {
      label: background.label,
      description: markdown,
      comment: background.comment,
      free_grant_kind: background.free_grant_kind || "skill",
      free_skill_id: background.free_skill_id,
      free_specialization_id: background.free_specialization_id,
      free_specialization_label: background.free_specialization_label ?? "",
      sort_order: background.sort_order,
      growth: background.growth.map((g) => ({
        roll_index: g.roll_index,
        grant_kind: g.grant_kind || "skill",
        skill_id: g.skill_id,
        specialization_id: g.specialization_id,
        specialization_label: g.specialization_label ?? "",
      })),
      used_by: propsUsedBy(),
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
    if (!window.confirm(`Delete background “${background.label}”?`)) return;
    error = false;
    status = "Deleting…";
    try {
      await api.deleteBackground(background.id);
      status = "Deleted";
      await onDeleted?.();
    } catch (e) {
      error = true;
      status = e instanceof Error ? e.message : String(e);
    }
  }

  const freeMode = $derived(
    isWildcard(freePick) ? "none" : skillMode(pickSkillId(freePick)),
  );
</script>

<div class="forge-panel p-3">
  <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
    <div>
      <p class="font-display text-2xl leading-none text-ink">{enLabel || background.slug}</p>
      <p class="mt-0.5 font-mono text-xs text-muted">
        {background.slug} · background #{background.id}
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
        <label for="bg-en-label">Label</label>
        <input id="bg-en-label" class="forge-input" bind:value={enLabel} />
      </div>
      {#key `bg-en-desc-${background.id}`}
        <RichTextField
          label="Description"
          value={enDesc}
          placeholder="(no description yet)"
          onSave={saveEnDescription}
        />
      {/key}
      <div class="forge-field">
        <label for="bg-free-skill">Free skill</label>
        <select
          id="bg-free-skill"
          class="forge-input"
          bind:value={freePick}
          onchange={() => void onFreePickChange()}
        >
          <option value="anyCombat">Any combat</option>
          <option value="anySkill">Any</option>
          {#each skills as s (s.id)}
            <option value={String(s.id)}>{s.label} ({s.slug})</option>
          {/each}
        </select>
      </div>
      {#if showsCatalog(freeMode)}
        <div class="forge-field">
          <label for="bg-free-spec">Free specialization</label>
          <select
            id="bg-free-spec"
            class="forge-input"
            bind:value={freeSpecId}
            onchange={onFreeCatalogChange}
          >
            <option value={0}>(none)</option>
            {#each specsFor(pickSkillId(freePick)) as sp (sp.id)}
              <option value={sp.id}>{sp.label} ({sp.slug})</option>
            {/each}
          </select>
        </div>
      {/if}
      {#if showsFreeform(freeMode)}
        <div class="forge-field">
          <label for="bg-free-spec-label"
            >{freeMode === "parameterized"
              ? "Freeform specialization"
              : "Free specialization"}</label
          >
          <input
            id="bg-free-spec-label"
            class="forge-input"
            bind:value={freeSpecLabel}
            oninput={onFreeLabelInput}
            placeholder="(optional English label)"
          />
        </div>
      {/if}
      <div class="forge-field">
        <label for="bg-sort">Sort order</label>
        <input id="bg-sort" class="forge-input max-w-32" type="number" bind:value={enSort} />
      </div>
    </section>

    <section>
      <h3 class="mb-2 font-display text-lg text-ink">Русский</h3>
      <div class="forge-field">
        <label for="bg-ru-label">Label</label>
        <input
          id="bg-ru-label"
          class="forge-input"
          bind:value={ruLabel}
          placeholder="(empty = fall back to English)"
        />
      </div>
      {#key `bg-ru-desc-${background.id}`}
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
    <h3 class="mb-2 font-display text-lg text-ink">Growth table (8 rows)</h3>
    <p class="mb-2 text-sm text-muted">
      Concrete skill+specialization pairs must be unique across free + growth. Any / Any combat may
      repeat. Leave specialization empty to let the player choose at creation.
    </p>
    <div class="flex flex-col gap-1">
      {#each growth as row (row.roll_index)}
        {@const mode = isWildcard(row.pick) ? "none" : skillMode(pickSkillId(row.pick))}
        <div class="flex flex-wrap items-end gap-2 rounded-md border border-line px-2.5 py-1.5">
          <span class="w-8 pb-1.5 font-mono text-xs text-muted">{row.roll_index}</span>
          <div class="forge-field mb-0 min-w-40 flex-1">
            <label for={`bg-growth-skill-${row.roll_index}`}>Skill</label>
            <select
              id={`bg-growth-skill-${row.roll_index}`}
              class="forge-input"
              bind:value={row.pick}
              onchange={() => void onGrowthPickChange(row)}
            >
              <option value="anyCombat">Any combat</option>
              <option value="anySkill">Any</option>
              {#each skills as s (s.id)}
                <option value={String(s.id)}>{s.label}</option>
              {/each}
            </select>
          </div>
          {#if showsCatalog(mode)}
            <div class="forge-field mb-0 min-w-40 flex-1">
              <label for={`bg-growth-spec-${row.roll_index}`}>Specialization</label>
              <select
                id={`bg-growth-spec-${row.roll_index}`}
                class="forge-input"
                bind:value={row.specialization_id}
                onchange={() => onGrowthCatalogChange(row)}
              >
                <option value={0}>(none)</option>
                {#each specsFor(pickSkillId(row.pick)) as sp (sp.id)}
                  <option value={sp.id}>{sp.label}</option>
                {/each}
              </select>
            </div>
          {/if}
          {#if showsFreeform(mode)}
            <div class="forge-field mb-0 min-w-40 flex-1">
              <label for={`bg-growth-spec-label-${row.roll_index}`}>Freeform</label>
              <input
                id={`bg-growth-spec-label-${row.roll_index}`}
                class="forge-input"
                bind:value={row.specialization_label}
                oninput={() => onGrowthLabelInput(row)}
                placeholder="(optional)"
              />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="mt-3 border-t border-line pt-3">
    <h3 class="mb-2 font-display text-lg text-ink">Region × culture</h3>
    <p class="mb-2 text-sm text-muted">
      Where this background is offered. Adds the culture to the region if missing (weight 1).
    </p>
    <div class="mb-2 flex flex-wrap items-end gap-2">
      <div class="forge-field mb-0 min-w-40 flex-1">
        <label for="bg-use-region">Region</label>
        <select
          id="bg-use-region"
          class="forge-input"
          bind:value={addUseRegionId}
          onchange={() => {
            addUseCultureId = "";
          }}
        >
          <option value="">Select…</option>
          {#each regions as r (r.id)}
            <option value={r.id}>{r.label} ({r.slug})</option>
          {/each}
        </select>
      </div>
      <div class="forge-field mb-0 min-w-40 flex-1">
        <label for="bg-use-culture">Culture</label>
        <select
          id="bg-use-culture"
          class="forge-input"
          bind:value={addUseCultureId}
          disabled={addUseRegionId === ""}
        >
          <option value="">Select…</option>
          {#if addUseRegionId !== ""}
            {#each availableCulturesForRegion(Number(addUseRegionId)) as c (c.id)}
              <option value={c.id}>{c.label} ({c.slug})</option>
            {/each}
          {/if}
        </select>
      </div>
      <button
        type="button"
        class="forge-btn"
        disabled={addUseRegionId === "" || addUseCultureId === ""}
        onclick={addUse}>Add</button
      >
    </div>
    {#if usedByRows.length === 0}
      <p class="text-sm text-muted">Not assigned to any region×culture.</p>
    {:else}
      <div class="flex flex-col gap-1">
        {#each usedByRows as row (row.region_id + ":" + row.race_id)}
          <div
            class="flex flex-wrap items-center gap-2 rounded-md border border-line px-2.5 py-1.5"
          >
            <span class="min-w-32 flex-1 text-sm">
              {cultureLabel(row.race_id)}
              <span class="text-xs text-muted">· {regionLabel(row.region_id)}</span>
            </span>
            <button
              type="button"
              class="forge-btn py-1"
              onclick={() => removeUse(row.region_id, row.race_id)}>Remove</button
            >
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="mt-2 border-t border-line pt-3">
    <div class="forge-field mb-0">
      <label for="bg-comment"
        >Comment <span class="normal-case tracking-normal text-muted">(all languages)</span></label
      >
      <textarea
        id="bg-comment"
        class="forge-input min-h-16 resize-y"
        bind:value={enComment}
        placeholder="Author notes — not translated, not shown in play"></textarea>
    </div>
  </div>

  <LinkPanel title="Free skill" links={freeSkillLinks} empty="No free skill." />
</div>
