<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { api, TALENT_CATEGORIES, type Talent, type TranslationField } from "$lib/api";
  import RichTextField from "$lib/RichTextField.svelte";
  import LinkPanel from "$lib/LinkPanel.svelte";

  type Props = {
    talent: Talent;
    onSaved: () => void | Promise<void>;
    onDeleted?: () => void | Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
  };

  let { talent, onSaved, onDeleted, onDirtyChange }: Props = $props();

  let enLabel = $state("");
  let enDesc = $state("");
  let enComment = $state("");
  let enSort = $state(0);
  let category = $state("general");
  let featureKey = $state("");
  let grantsJson = $state("");
  let ruLabel = $state("");
  let ruDesc = $state("");
  let status = $state("");
  let error = $state(false);

  type Baseline = {
    enLabel: string;
    enComment: string;
    enSort: number;
    category: string;
    featureKey: string;
    grantsJson: string;
    ruLabel: string;
  };

  let baseline = $state<Baseline>({
    enLabel: "",
    enComment: "",
    enSort: 0,
    category: "general",
    featureKey: "",
    grantsJson: "",
    ruLabel: "",
  });

  const cultureLinks = $derived(
    (talent.linked_cultures ?? []).map((c) => ({ slug: c.slug, label: c.label })),
  );
  const classLinks = $derived(
    (talent.linked_classes ?? []).map((c) => ({ slug: c.slug, label: c.label })),
  );

  function snapshotFromProps(): Baseline {
    return {
      enLabel: talent.label,
      enComment: talent.comment ?? "",
      enSort: talent.sort_order,
      category: talent.category || "general",
      featureKey: talent.feature_key ?? "",
      grantsJson: talent.grants_json ?? "",
      ruLabel: talent.translations?.label ?? "",
    };
  }

  function applyBaseline(b: Baseline) {
    enLabel = b.enLabel;
    enComment = b.enComment;
    enSort = b.enSort;
    category = b.category;
    featureKey = b.featureKey;
    grantsJson = b.grantsJson;
    ruLabel = b.ruLabel;
  }

  function resetFromProps() {
    const b = snapshotFromProps();
    baseline = b;
    applyBaseline(b);
    enDesc = talent.description ?? "";
    ruDesc = talent.translations?.description ?? "";
    status = "";
    error = false;
  }

  $effect(() => {
    void talent.id;
    untrack(() => resetFromProps());
  });

  const dirty = $derived(
    enLabel !== baseline.enLabel ||
      enComment !== baseline.enComment ||
      enSort !== baseline.enSort ||
      category !== baseline.category ||
      featureKey !== baseline.featureKey ||
      grantsJson !== baseline.grantsJson ||
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

  async function saveOverlay(field: TranslationField, value: string) {
    const trimmed = value.trim();
    if (trimmed === "") {
      await api.deleteTranslation({
        entity_kind: "talent",
        entity_id: talent.id,
        locale: "ru",
        field,
      });
      return;
    }
    await api.putTranslation({
      entity_kind: "talent",
      entity_id: talent.id,
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
      await api.patchTalent(talent.id, {
        label: enLabel,
        description: enDesc,
        comment: enComment,
        category,
        feature_key: featureKey,
        grants_json: grantsJson,
        sort_order: enSort,
      });
      await saveOverlay("label", ruLabel);
      status = "Saved";
      await onSaved();
      baseline = {
        enLabel,
        enComment,
        enSort,
        category,
        featureKey,
        grantsJson,
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
    await api.patchTalent(talent.id, {
      label: talent.label,
      description: markdown,
      comment: talent.comment,
      category: talent.category,
      feature_key: talent.feature_key,
      grants_json: talent.grants_json,
      sort_order: talent.sort_order,
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
    if (!window.confirm(`Delete talent “${talent.label}”?`)) return;
    error = false;
    status = "Deleting…";
    try {
      await api.deleteTalent(talent.id);
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
      <p class="font-display text-2xl leading-none text-ink">{enLabel || talent.slug}</p>
      <p class="mt-0.5 font-mono text-xs text-muted">
        {talent.slug} · talent #{talent.id}
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
        <label for="talent-en-label">Label</label>
        <input id="talent-en-label" class="forge-input" bind:value={enLabel} />
      </div>
      {#key `talent-en-desc-${talent.id}`}
        <RichTextField
          label="Description"
          value={enDesc}
          placeholder="(no description yet)"
          onSave={saveEnDescription}
        />
      {/key}
      <div class="forge-field">
        <label for="talent-category">Category</label>
        <select id="talent-category" class="forge-input" bind:value={category}>
          {#each TALENT_CATEGORIES as cat}
            <option value={cat}>{cat}</option>
          {/each}
        </select>
      </div>
      <div class="forge-field">
        <label for="talent-feature">Feature key</label>
        <input id="talent-feature" class="forge-input font-mono" bind:value={featureKey} />
      </div>
      <div class="forge-field">
        <label for="talent-grants">Grants JSON</label>
        <textarea
          id="talent-grants"
          class="forge-input min-h-24 resize-y font-mono text-xs"
          bind:value={grantsJson}></textarea>
      </div>
      <div class="forge-field">
        <label for="talent-sort">Sort order</label>
        <input id="talent-sort" class="forge-input max-w-32" type="number" bind:value={enSort} />
      </div>
    </section>

    <section>
      <h3 class="mb-2 font-display text-lg text-ink">Русский</h3>
      <div class="forge-field">
        <label for="talent-ru-label">Label</label>
        <input
          id="talent-ru-label"
          class="forge-input"
          bind:value={ruLabel}
          placeholder="(empty = fall back to English)"
        />
      </div>
      {#key `talent-ru-desc-${talent.id}`}
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
      <label for="talent-comment"
        >Comment <span class="normal-case tracking-normal text-muted">(all languages)</span></label
      >
      <textarea
        id="talent-comment"
        class="forge-input min-h-16 resize-y"
        bind:value={enComment}
        placeholder="Author notes — not translated, not shown in play"></textarea>
    </div>
  </div>

  <LinkPanel title="Linked cultures" links={cultureLinks} empty="Not linked to any culture." />
  <LinkPanel title="Linked classes" links={classLinks} empty="Not linked to any class." />
</div>
