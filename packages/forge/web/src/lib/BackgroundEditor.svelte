<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import {
    api,
    type Background,
    type GrowthRowIn,
    type Skill,
    type Specialization,
    type TranslationField,
  } from "$lib/api";
  import RichTextField from "$lib/RichTextField.svelte";
  import LinkPanel from "$lib/LinkPanel.svelte";

  type GrowthDraft = {
    roll_index: number;
    skill_id: number;
    specialization_id: number;
  };

  type Props = {
    background: Background;
    skills: Skill[];
    /** specialization_id → list; loaded by parent for skills in use */
    specsBySkill: Record<number, Specialization[]>;
    loadSpecs: (skillId: number) => Promise<void>;
    onSaved: () => void | Promise<void>;
    onDeleted?: () => void | Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
  };

  let {
    background,
    skills,
    specsBySkill,
    loadSpecs,
    onSaved,
    onDeleted,
    onDirtyChange,
  }: Props = $props();

  const usedByLinks = $derived(
    (background.used_by ?? []).map((u) => ({
      label: u.race_label,
      slug: `${u.region_slug}/${u.race_slug}`,
      detail: u.region_label,
    })),
  );
  const freeSkillLinks = $derived.by(() => {
    if (!background.free_skill_slug) return [] as { slug: string; label: string; detail?: string }[];
    const link: { slug: string; label: string; detail?: string } = {
      slug: background.free_skill_slug,
      label:
        skills.find((s) => s.id === background.free_skill_id)?.label ?? background.free_skill_slug,
    };
    if (background.free_specialization_slug) {
      link.detail = background.free_specialization_slug;
    }
    return [link];
  });

  let enLabel = $state("");
  let enDesc = $state("");
  let enComment = $state("");
  let enSort = $state(0);
  let freeSkillId = $state(0);
  let freeSpecId = $state(0);
  let growth = $state<GrowthDraft[]>([]);
  let ruLabel = $state("");
  let ruDesc = $state("");
  let status = $state("");
  let error = $state(false);

  type Baseline = {
    enLabel: string;
    enComment: string;
    enSort: number;
    freeSkillId: number;
    freeSpecId: number;
    growth: GrowthDraft[];
    ruLabel: string;
  };

  let baseline = $state<Baseline>({
    enLabel: "",
    enComment: "",
    enSort: 0,
    freeSkillId: 0,
    freeSpecId: 0,
    growth: [],
    ruLabel: "",
  });

  function serializeGrowth(rows: GrowthDraft[]): string {
    return JSON.stringify(
      rows.map((r) => ({
        roll_index: r.roll_index,
        skill_id: Number(r.skill_id),
        specialization_id: Number(r.specialization_id) > 0 ? Number(r.specialization_id) : null,
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
        skill_id: g?.skill_id ?? skills[0]?.id ?? 0,
        specialization_id: g?.specialization_id ?? 0,
      });
    }
    return rows;
  }

  function snapshotFromProps(): Baseline {
    return {
      enLabel: background.label,
      enComment: background.comment ?? "",
      enSort: background.sort_order,
      freeSkillId: background.free_skill_id,
      freeSpecId: background.free_specialization_id ?? 0,
      growth: growthFromEntity(background),
      ruLabel: background.translations?.label ?? "",
    };
  }

  function applyBaseline(b: Baseline) {
    enLabel = b.enLabel;
    enComment = b.enComment;
    enSort = b.enSort;
    freeSkillId = b.freeSkillId;
    freeSpecId = b.freeSpecId;
    growth = b.growth.map((r) => ({ ...r }));
    ruLabel = b.ruLabel;
  }

  async function ensureSpecsForForm(b: Baseline) {
    const ids = new Set<number>([b.freeSkillId, ...b.growth.map((g) => g.skill_id)]);
    for (const id of ids) {
      if (id > 0) await loadSpecs(id);
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
      freeSkillId !== baseline.freeSkillId ||
      freeSpecId !== baseline.freeSpecId ||
      serializeGrowth(growth) !== serializeGrowth(baseline.growth) ||
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

  async function onFreeSkillChange() {
    freeSpecId = 0;
    await loadSpecs(Number(freeSkillId));
  }

  async function onGrowthSkillChange(row: GrowthDraft) {
    row.specialization_id = 0;
    await loadSpecs(Number(row.skill_id));
  }

  function toGrowthIn(): GrowthRowIn[] {
    return growth.map((r) => ({
      roll_index: r.roll_index,
      skill_id: Number(r.skill_id),
      specialization_id: Number(r.specialization_id) > 0 ? Number(r.specialization_id) : null,
    }));
  }

  function freeSpecPayload(): number | null {
    return Number(freeSpecId) > 0 ? Number(freeSpecId) : null;
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
      await api.patchBackground(background.id, {
        label: enLabel,
        description: enDesc,
        comment: enComment,
        free_skill_id: Number(freeSkillId),
        free_specialization_id: freeSpecPayload(),
        sort_order: enSort,
        growth: toGrowthIn(),
      });
      await saveOverlay("label", ruLabel);
      status = "Saved";
      await onSaved();
      baseline = {
        enLabel,
        enComment,
        enSort,
        freeSkillId,
        freeSpecId,
        growth: growth.map((r) => ({ ...r })),
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
      free_skill_id: background.free_skill_id,
      free_specialization_id: background.free_specialization_id,
      sort_order: background.sort_order,
      growth: background.growth.map((g) => ({
        roll_index: g.roll_index,
        skill_id: g.skill_id,
        specialization_id: g.specialization_id,
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
          bind:value={freeSkillId}
          onchange={() => void onFreeSkillChange()}
        >
          {#each skills as s (s.id)}
            <option value={s.id}>{s.label} ({s.slug})</option>
          {/each}
        </select>
      </div>
      <div class="forge-field">
        <label for="bg-free-spec">Free specialization</label>
        <select id="bg-free-spec" class="forge-input" bind:value={freeSpecId}>
          <option value={0}>(none)</option>
          {#each specsFor(Number(freeSkillId)) as sp (sp.id)}
            <option value={sp.id}>{sp.label} ({sp.slug})</option>
          {/each}
        </select>
      </div>
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
      Each roll_index 1–8 must be a unique skill+specialization, also distinct from the free grant.
    </p>
    <div class="flex flex-col gap-1">
      {#each growth as row (row.roll_index)}
        <div class="flex flex-wrap items-end gap-2 rounded-md border border-line px-2.5 py-1.5">
          <span class="w-8 pb-1.5 font-mono text-xs text-muted">{row.roll_index}</span>
          <div class="forge-field mb-0 min-w-40 flex-1">
            <label for={`bg-growth-skill-${row.roll_index}`}>Skill</label>
            <select
              id={`bg-growth-skill-${row.roll_index}`}
              class="forge-input"
              bind:value={row.skill_id}
              onchange={() => void onGrowthSkillChange(row)}
            >
              {#each skills as s (s.id)}
                <option value={s.id}>{s.label}</option>
              {/each}
            </select>
          </div>
          <div class="forge-field mb-0 min-w-40 flex-1">
            <label for={`bg-growth-spec-${row.roll_index}`}>Specialization</label>
            <select
              id={`bg-growth-spec-${row.roll_index}`}
              class="forge-input"
              bind:value={row.specialization_id}
            >
              <option value={0}>(none)</option>
              {#each specsFor(Number(row.skill_id)) as sp (sp.id)}
                <option value={sp.id}>{sp.label}</option>
              {/each}
            </select>
          </div>
        </div>
      {/each}
    </div>
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
  <LinkPanel
    title="Used by region×culture"
    links={usedByLinks}
    empty="Not assigned to any region×culture."
  />
</div>
