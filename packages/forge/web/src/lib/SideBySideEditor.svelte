<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import type { EntityKind, TranslationField, TranslationMap } from "$lib/api";
  import { api } from "$lib/api";
  import RichTextField from "$lib/RichTextField.svelte";

  type Props = {
    kind: EntityKind;
    id: number;
    slug: string;
    en: {
      label: string;
      abbreviation?: string;
      description?: string;
      comment: string;
      sort_order: number;
    };
    translations: TranslationMap;
    showAbbreviation?: boolean;
    showDescription?: boolean;
    /** When editing a skill: governing attribute + specialization mode. */
    skillControls?: {
      attribute_id: number;
      specialization_mode: string;
      attributes: { id: number; slug: string; label: string }[];
    };
    onSaved: () => void | Promise<void>;
    /** Page-level form dirty (excludes Markdown description fields). */
    onDirtyChange?: (dirty: boolean) => void;
  };

  let {
    kind,
    id,
    slug,
    en,
    translations,
    showAbbreviation = false,
    showDescription = true,
    skillControls = undefined,
    onSaved,
    onDirtyChange,
  }: Props = $props();

  let enLabel = $state("");
  let enAbbr = $state("");
  let enDesc = $state("");
  let enComment = $state("");
  let enSort = $state(0);
  let skillAttributeId = $state(0);
  let skillMode = $state("fixed");
  let ruLabel = $state("");
  let ruAbbr = $state("");
  let ruDesc = $state("");
  let status = $state("");
  let error = $state(false);

  type Baseline = {
    enLabel: string;
    enAbbr: string;
    enComment: string;
    enSort: number;
    skillAttributeId: number;
    skillMode: string;
    ruLabel: string;
    ruAbbr: string;
  };

  let baseline = $state<Baseline>({
    enLabel: "",
    enAbbr: "",
    enComment: "",
    enSort: 0,
    skillAttributeId: 0,
    skillMode: "fixed",
    ruLabel: "",
    ruAbbr: "",
  });

  function snapshotFromProps(): Baseline {
    return {
      enLabel: en.label,
      enAbbr: en.abbreviation ?? "",
      enComment: en.comment ?? "",
      enSort: en.sort_order,
      skillAttributeId: skillControls?.attribute_id ?? 0,
      skillMode: skillControls?.specialization_mode ?? "fixed",
      ruLabel: translations.label ?? "",
      ruAbbr: translations.abbreviation ?? "",
    };
  }

  function applyBaseline(b: Baseline) {
    enLabel = b.enLabel;
    enAbbr = b.enAbbr;
    enComment = b.enComment;
    enSort = b.enSort;
    skillAttributeId = b.skillAttributeId;
    skillMode = b.skillMode;
    ruLabel = b.ruLabel;
    ruAbbr = b.ruAbbr;
  }

  function resetFromProps() {
    const b = snapshotFromProps();
    baseline = b;
    applyBaseline(b);
    enDesc = en.description ?? "";
    ruDesc = translations.description ?? "";
    status = "";
    error = false;
  }

  // Reload form only when the entity identity changes — not when onSaved refreshes props
  // (description field saves must not wipe unrelated dirty inputs).
  $effect(() => {
    void id;
    void kind;
    untrack(() => resetFromProps());
  });

  const dirty = $derived(
    enLabel !== baseline.enLabel ||
      enAbbr !== baseline.enAbbr ||
      enComment !== baseline.enComment ||
      enSort !== baseline.enSort ||
      skillAttributeId !== baseline.skillAttributeId ||
      skillMode !== baseline.skillMode ||
      ruLabel !== baseline.ruLabel ||
      ruAbbr !== baseline.ruAbbr,
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
        entity_kind: kind,
        entity_id: id,
        locale: "ru",
        field,
      });
      return;
    }
    await api.putTranslation({
      entity_kind: kind,
      entity_id: id,
      locale: "ru",
      field,
      value: trimmed,
    });
  }

  /** Page Save — metadata only. Descriptions are saved by RichTextField. */
  async function save() {
    if (!dirty) return;
    status = "Saving…";
    error = false;
    try {
      const shared = {
        label: enLabel,
        description: enDesc,
        comment: enComment,
        sort_order: enSort,
      };
      if (kind === "attribute") {
        await api.patchAttribute(id, {
          ...shared,
          abbreviation: enAbbr,
        });
      } else if (kind === "skill") {
        await api.patchSkill(id, {
          ...shared,
          attribute_id: Number(skillAttributeId),
          specialization_mode: skillMode,
        });
      } else if (kind === "specialization") {
        await api.patchSpecialization(id, shared);
      } else if (kind === "class") {
        await api.patchClass(id, shared);
      } else {
        await api.patchVocab(id, {
          label: enLabel,
          abbreviation: enAbbr,
          comment: enComment,
          sort_order: enSort,
        });
      }

      await saveOverlay("label", ruLabel);
      if (showAbbreviation) {
        await saveOverlay("abbreviation", ruAbbr);
      }

      status = "Saved";
      await onSaved();
      baseline = {
        enLabel,
        enAbbr,
        enComment,
        enSort,
        skillAttributeId,
        skillMode,
        ruLabel,
        ruAbbr,
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
    // Patch from committed props only — never dirty form fields — so a description
    // save cannot clobber unsaved label / skill-control edits.
    const shared = {
      label: en.label,
      description: markdown,
      comment: en.comment,
      sort_order: en.sort_order,
    };
    if (kind === "attribute") {
      await api.patchAttribute(id, {
        ...shared,
        abbreviation: en.abbreviation ?? "",
      });
    } else if (kind === "skill") {
      if (!skillControls) throw new Error("skillControls required");
      await api.patchSkill(id, {
        ...shared,
        attribute_id: skillControls.attribute_id,
        specialization_mode: skillControls.specialization_mode,
      });
    } else if (kind === "specialization") {
      await api.patchSpecialization(id, shared);
    } else if (kind === "class") {
      await api.patchClass(id, shared);
    } else {
      throw new Error("description not supported for this kind");
    }
    enDesc = markdown;
    await onSaved();
  }

  async function saveRuDescription(markdown: string) {
    await saveOverlay("description", markdown);
    ruDesc = markdown;
    await onSaved();
  }
</script>

<div class="forge-panel p-3">
  <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
    <div>
      <p class="font-display text-2xl leading-none text-ink">{enLabel || slug}</p>
      <p class="mt-0.5 font-mono text-xs text-muted">
        {slug} · {kind} #{id}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <button type="button" class="forge-btn" disabled={!dirty} onclick={cancel}>Cancel</button>
      <button type="button" class="forge-btn forge-btn-primary" disabled={!dirty} onclick={() => void save()}
        >Save</button
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
        <label for="en-label">Label</label>
        <input id="en-label" class="forge-input" bind:value={enLabel} />
      </div>
      {#if showAbbreviation}
        <div class="forge-field">
          <label for="en-abbr">Abbreviation</label>
          <input id="en-abbr" class="forge-input" bind:value={enAbbr} />
        </div>
      {/if}
      {#if showDescription}
        {#key `en-desc-${id}`}
          <RichTextField
            label="Description"
            value={enDesc}
            placeholder="(no description yet)"
            onSave={saveEnDescription}
          />
        {/key}
      {/if}
      <div class="forge-field">
        <label for="en-sort">Sort order</label>
        <input id="en-sort" class="forge-input max-w-32" type="number" bind:value={enSort} />
      </div>
      {#if kind === "skill" && skillControls}
        <div class="forge-field">
          <label for="skill-attr">Governing attribute</label>
          <select id="skill-attr" class="forge-input" bind:value={skillAttributeId}>
            {#each skillControls.attributes as attr (attr.id)}
              <option value={attr.id}>{attr.label} ({attr.slug})</option>
            {/each}
          </select>
        </div>
        <div class="forge-field">
          <label for="skill-mode">Specialization mode</label>
          <select id="skill-mode" class="forge-input" bind:value={skillMode}>
            <option value="none">none</option>
            <option value="fixed">fixed</option>
            <option value="free">free</option>
            <option value="parameterized">parameterized</option>
          </select>
        </div>
      {/if}
    </section>

    <section>
      <h3 class="mb-2 font-display text-lg text-ink">Русский</h3>
      <div class="forge-field">
        <label for="ru-label">Label</label>
        <input
          id="ru-label"
          class="forge-input"
          bind:value={ruLabel}
          placeholder="(empty = fall back to English)"
        />
      </div>
      {#if showAbbreviation}
        <div class="forge-field">
          <label for="ru-abbr">Abbreviation</label>
          <input
            id="ru-abbr"
            class="forge-input"
            bind:value={ruAbbr}
            placeholder="(empty = fall back)"
          />
        </div>
      {/if}
      {#if showDescription}
        {#key `ru-desc-${id}`}
          <RichTextField
            label="Description"
            value={ruDesc}
            placeholder="(empty = fall back to English)"
            onSave={saveRuDescription}
          />
        {/key}
      {/if}
    </section>
  </div>

  <div class="mt-2 border-t border-line pt-3">
    <div class="forge-field mb-0">
      <label for="comment"
        >Comment <span class="normal-case tracking-normal text-muted">(all languages)</span></label
      >
      <textarea
        id="comment"
        class="forge-input min-h-16 resize-y"
        bind:value={enComment}
        placeholder="Author notes — not translated, not shown in play"
      ></textarea>
    </div>
  </div>
</div>
