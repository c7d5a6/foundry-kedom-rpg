<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { api, type ClassRow, type Race, type Talent, type TranslationField } from "$lib/api";
  import RichTextField from "$lib/RichTextField.svelte";
  import LinkPanel from "$lib/LinkPanel.svelte";

  type Props = {
    culture: Race;
    talents: Talent[];
    classes: ClassRow[];
    onSaved: () => void | Promise<void>;
    onDeleted?: () => void | Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
  };

  let { culture, talents, classes, onSaved, onDeleted, onDirtyChange }: Props = $props();

  const regionLinks = $derived(
    (culture.linked_regions ?? []).map((r) => ({
      slug: r.region_slug,
      label: r.region_label,
      detail: `weight ${r.weight}`,
    })),
  );
  const bgLinks = $derived(
    (culture.linked_backgrounds ?? []).map((b) => ({
      slug: `${b.region_slug}/${b.background_slug}`,
      label: b.background_label,
      detail: b.region_label,
    })),
  );
  const talentLink = $derived(
    culture.talent_slug
      ? [{ slug: culture.talent_slug, label: culture.talent_slug }]
      : [],
  );
  const classLinks = $derived(
    culture.classes.map((c) => ({ slug: c.class_slug, label: c.class_label })),
  );

  let enLabel = $state("");
  let enDesc = $state("");
  let enComment = $state("");
  let enSort = $state(0);
  let talentId = $state(0);
  let classIds = $state<number[]>([]);
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
    ruLabel: string;
  };

  let baseline = $state<Baseline>({
    enLabel: "",
    enComment: "",
    enSort: 0,
    talentId: 0,
    classIds: [],
    ruLabel: "",
  });

  function snapshotFromProps(): Baseline {
    return {
      enLabel: culture.label,
      enComment: culture.comment ?? "",
      enSort: culture.sort_order,
      talentId: culture.talent_id ?? 0,
      classIds: [...culture.classes.map((c) => c.class_id)].sort((a, b) => a - b),
      ruLabel: culture.translations?.label ?? "",
    };
  }

  function applyBaseline(b: Baseline) {
    enLabel = b.enLabel;
    enComment = b.enComment;
    enSort = b.enSort;
    talentId = b.talentId;
    classIds = [...b.classIds];
    ruLabel = b.ruLabel;
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

  const dirty = $derived(
    enLabel !== baseline.enLabel ||
      enComment !== baseline.enComment ||
      enSort !== baseline.enSort ||
      talentId !== baseline.talentId ||
      !classIdsEqual(
        [...classIds].sort((a, b) => a - b),
        baseline.classIds,
      ) ||
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
        parent_race_id: culture.parent_race_id,
        talent_id: talentPayload(),
        sort_order: enSort,
        class_ids: classIds,
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
    await api.patchRace(culture.id, {
      label: culture.label,
      description: markdown,
      comment: culture.comment,
      parent_race_id: culture.parent_race_id,
      talent_id: culture.talent_id,
      sort_order: culture.sort_order,
      class_ids: culture.classes.map((c) => c.class_id),
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

  <LinkPanel title="Talent" links={talentLink} empty="No talent linked." />
  <LinkPanel title="Allowed classes" links={classLinks} empty="No classes allowed." />
  <LinkPanel title="Used in regions" links={regionLinks} empty="Not assigned to any region." />
  <LinkPanel
    title="Backgrounds via regions"
    links={bgLinks}
    empty="No region×culture background assignments."
  />
</div>
