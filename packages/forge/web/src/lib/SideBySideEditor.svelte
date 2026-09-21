<script lang="ts">
  import type { EntityKind, TranslationField, TranslationMap } from "$lib/api";
  import { api } from "$lib/api";

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

  $effect(() => {
    enLabel = en.label;
    enAbbr = en.abbreviation ?? "";
    enDesc = en.description ?? "";
    enComment = en.comment ?? "";
    enSort = en.sort_order;
    skillAttributeId = skillControls?.attribute_id ?? 0;
    skillMode = skillControls?.specialization_mode ?? "fixed";
    ruLabel = translations.label ?? "";
    ruAbbr = translations.abbreviation ?? "";
    ruDesc = translations.description ?? "";
    status = "";
    error = false;
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

  async function save() {
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
      if (showDescription) {
        await saveOverlay("description", ruDesc);
      }

      status = "Saved";
      await onSaved();
    } catch (e) {
      error = true;
      status = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<div class="forge-panel p-5">
  <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
    <div>
      <p class="font-display text-2xl leading-none text-ink">{enLabel || slug}</p>
      <p class="mt-1 font-mono text-xs text-muted">
        {slug} · {kind} #{id}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <button type="button" class="forge-btn forge-btn-primary" onclick={save}>Save</button>
      {#if status}
        <span class="text-sm {error ? 'text-danger' : 'text-ok'}">{status}</span>
      {/if}
    </div>
  </div>

  <div class="grid gap-5 md:grid-cols-2">
    <section>
      <h3 class="mb-3 font-display text-lg text-ink">English</h3>
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
        <div class="forge-field">
          <label for="en-desc">Description</label>
          <textarea id="en-desc" class="forge-input min-h-28 resize-y" bind:value={enDesc}></textarea>
        </div>
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
      <h3 class="mb-3 font-display text-lg text-ink">Русский</h3>
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
        <div class="forge-field">
          <label for="ru-desc">Description</label>
          <textarea
            id="ru-desc"
            class="forge-input min-h-28 resize-y"
            bind:value={ruDesc}
            placeholder="(empty = fall back to English)"
          ></textarea>
        </div>
      {/if}
    </section>
  </div>

  <div class="mt-2 border-t border-line pt-4">
    <div class="forge-field mb-0">
      <label for="comment">Comment <span class="normal-case tracking-normal text-muted">(all languages)</span></label>
      <textarea
        id="comment"
        class="forge-input min-h-20 resize-y"
        bind:value={enComment}
        placeholder="Author notes — not translated, not shown in play"
      ></textarea>
    </div>
  </div>
</div>
