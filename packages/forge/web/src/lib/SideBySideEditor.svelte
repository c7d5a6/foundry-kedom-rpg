<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import {
    HIT_DIE_OPTIONS,
    api,
    type EntityKind,
    type TranslationField,
    type TranslationMap,
  } from "$lib/api";
  import RichTextField from "$lib/RichTextField.svelte";
  import LinkPanel from "$lib/LinkPanel.svelte";

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
    /** When editing a class: talents + progression fields from ClassDTO. */
    classControls?: {
      hit_die: string;
      talent_ids: number[];
      hit_die_priority: number;
      talent_picks_warrior: number;
      talent_picks_expert: number;
      talent_picks_any: number;
      save_primary: string;
      save_primary_priority: number;
      save_secondary: string;
      save_secondary_priority: number;
      arts_skill_key: string;
      talents: { id: number; slug: string; label: string }[];
      saves: { slug: string; label: string }[];
      skills: { slug: string; label: string }[];
    };
    /** Cultures that allow this class (class editor only). */
    linkedCultures?: { slug: string; label: string }[];
    onSaved: () => void | Promise<void>;
    onDeleted?: () => void | Promise<void>;
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
    classControls = undefined,
    linkedCultures = [],
    onSaved,
    onDeleted,
    onDirtyChange,
  }: Props = $props();

  const cultureLinks = $derived(linkedCultures.map((c) => ({ slug: c.slug, label: c.label })));
  const talentLinks = $derived.by(() => {
    if (kind !== "class" || !classControls) return [];
    const ids = new Set(classTalentIds);
    return classControls.talents
      .filter((t) => ids.has(t.id))
      .map((t) => ({ slug: t.slug, label: t.label }));
  });

  let enLabel = $state("");
  let enAbbr = $state("");
  let enDesc = $state("");
  let enComment = $state("");
  let enSort = $state(0);
  let skillAttributeId = $state(0);
  let skillMode = $state("fixed");
  let classHitDie = $state("");
  let classTalentIds = $state<number[]>([]);
  let classHitDiePriority = $state(0);
  let classTalentPicksWarrior = $state(0);
  let classTalentPicksExpert = $state(0);
  let classTalentPicksAny = $state(0);
  let classSavePrimary = $state("");
  let classSavePrimaryPriority = $state(0);
  let classSaveSecondary = $state("");
  let classSaveSecondaryPriority = $state(0);
  let classArtsSkillKey = $state("");
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
    classHitDie: string;
    classTalentIds: number[];
    classHitDiePriority: number;
    classTalentPicksWarrior: number;
    classTalentPicksExpert: number;
    classTalentPicksAny: number;
    classSavePrimary: string;
    classSavePrimaryPriority: number;
    classSaveSecondary: string;
    classSaveSecondaryPriority: number;
    classArtsSkillKey: string;
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
    classHitDie: "",
    classTalentIds: [],
    classHitDiePriority: 0,
    classTalentPicksWarrior: 0,
    classTalentPicksExpert: 0,
    classTalentPicksAny: 0,
    classSavePrimary: "",
    classSavePrimaryPriority: 0,
    classSaveSecondary: "",
    classSaveSecondaryPriority: 0,
    classArtsSkillKey: "",
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
      classHitDie: classControls?.hit_die ?? "",
      classTalentIds: [...(classControls?.talent_ids ?? [])],
      classHitDiePriority: classControls?.hit_die_priority ?? 0,
      classTalentPicksWarrior: classControls?.talent_picks_warrior ?? 0,
      classTalentPicksExpert: classControls?.talent_picks_expert ?? 0,
      classTalentPicksAny: classControls?.talent_picks_any ?? 0,
      classSavePrimary: classControls?.save_primary ?? "",
      classSavePrimaryPriority: classControls?.save_primary_priority ?? 0,
      classSaveSecondary: classControls?.save_secondary ?? "",
      classSaveSecondaryPriority: classControls?.save_secondary_priority ?? 0,
      classArtsSkillKey: classControls?.arts_skill_key ?? "",
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
    classHitDie = b.classHitDie;
    classTalentIds = [...b.classTalentIds];
    classHitDiePriority = b.classHitDiePriority;
    classTalentPicksWarrior = b.classTalentPicksWarrior;
    classTalentPicksExpert = b.classTalentPicksExpert;
    classTalentPicksAny = b.classTalentPicksAny;
    classSavePrimary = b.classSavePrimary;
    classSavePrimaryPriority = b.classSavePrimaryPriority;
    classSaveSecondary = b.classSaveSecondary;
    classSaveSecondaryPriority = b.classSaveSecondaryPriority;
    classArtsSkillKey = b.classArtsSkillKey;
    ruLabel = b.ruLabel;
    ruAbbr = b.ruAbbr;
  }

  function toggleClassTalent(id: number) {
    if (classTalentIds.includes(id)) {
      classTalentIds = classTalentIds.filter((x) => x !== id);
    } else {
      classTalentIds = [...classTalentIds, id];
    }
  }

  function talentIdsEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((id, i) => id === b[i]);
  }

  const hitDieOptions = $derived.by(() => {
    const opts = [...HIT_DIE_OPTIONS] as string[];
    if (classHitDie && !opts.includes(classHitDie)) opts.unshift(classHitDie);
    return opts;
  });

  function classPatchBody(label: string, description: string, comment: string, sortOrder: number) {
    return {
      label,
      description,
      comment,
      sort_order: sortOrder,
      hit_die: classHitDie,
      talent_ids: [...classTalentIds],
      hit_die_priority: Number(classHitDiePriority),
      talent_picks_warrior: Number(classTalentPicksWarrior),
      talent_picks_expert: Number(classTalentPicksExpert),
      talent_picks_any: Number(classTalentPicksAny),
      save_primary: classSavePrimary,
      save_primary_priority: Number(classSavePrimaryPriority),
      save_secondary: classSaveSecondary,
      save_secondary_priority: Number(classSaveSecondaryPriority),
      arts_skill_key: classArtsSkillKey,
    };
  }

  function classPatchFromProps(description: string) {
    if (!classControls) throw new Error("classControls required");
    return {
      label: en.label,
      description,
      comment: en.comment,
      sort_order: en.sort_order,
      hit_die: classControls.hit_die,
      talent_ids: [...(classControls.talent_ids ?? [])],
      hit_die_priority: classControls.hit_die_priority,
      talent_picks_warrior: classControls.talent_picks_warrior,
      talent_picks_expert: classControls.talent_picks_expert,
      talent_picks_any: classControls.talent_picks_any,
      save_primary: classControls.save_primary,
      save_primary_priority: classControls.save_primary_priority,
      save_secondary: classControls.save_secondary,
      save_secondary_priority: classControls.save_secondary_priority,
      arts_skill_key: classControls.arts_skill_key,
    };
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
      classHitDie !== baseline.classHitDie ||
      !talentIdsEqual(classTalentIds, baseline.classTalentIds) ||
      classHitDiePriority !== baseline.classHitDiePriority ||
      classTalentPicksWarrior !== baseline.classTalentPicksWarrior ||
      classTalentPicksExpert !== baseline.classTalentPicksExpert ||
      classTalentPicksAny !== baseline.classTalentPicksAny ||
      classSavePrimary !== baseline.classSavePrimary ||
      classSavePrimaryPriority !== baseline.classSavePrimaryPriority ||
      classSaveSecondary !== baseline.classSaveSecondary ||
      classSaveSecondaryPriority !== baseline.classSaveSecondaryPriority ||
      classArtsSkillKey !== baseline.classArtsSkillKey ||
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
        await api.patchClass(id, classPatchBody(enLabel, enDesc, enComment, enSort));
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
        classHitDie,
        classTalentIds: [...classTalentIds],
        classHitDiePriority,
        classTalentPicksWarrior,
        classTalentPicksExpert,
        classTalentPicksAny,
        classSavePrimary,
        classSavePrimaryPriority,
        classSaveSecondary,
        classSaveSecondaryPriority,
        classArtsSkillKey,
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
      await api.patchClass(id, classPatchFromProps(markdown));
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

  async function remove() {
    if (kind !== "class") return;
    if (!window.confirm(`Delete class “${en.label}”?`)) return;
    error = false;
    status = "Deleting…";
    try {
      await api.deleteClass(id);
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
      <p class="font-display text-2xl leading-none text-ink">{enLabel || slug}</p>
      <p class="mt-0.5 font-mono text-xs text-muted">
        {slug} · {kind} #{id}
      </p>
    </div>
    <div class="flex items-center gap-2">
      {#if kind === "class"}
        <button type="button" class="forge-btn text-danger" onclick={() => void remove()}
          >Delete</button
        >
      {/if}
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
      {#if kind === "class" && classControls}
        <fieldset class="forge-field">
          <legend class="text-xs font-medium tracking-wide text-muted uppercase">Talents</legend>
          <div
            class="mt-1 flex max-h-48 flex-col gap-0.5 overflow-auto rounded-md border border-line p-2"
          >
            {#each classControls.talents as t (t.id)}
              <label class="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={classTalentIds.includes(t.id)}
                  onchange={() => toggleClassTalent(t.id)}
                />
                <span>{t.label}</span>
                <span class="font-mono text-xs text-muted">{t.slug}</span>
              </label>
            {:else}
              <p class="text-sm text-muted">(no talents)</p>
            {/each}
          </div>
        </fieldset>
        <div class="forge-field">
          <label for="class-hit-die">Hit die</label>
          <select id="class-hit-die" class="forge-input font-mono" bind:value={classHitDie}>
            <option value="">(none)</option>
            {#each hitDieOptions as die}
              <option value={die}>{die}</option>
            {/each}
          </select>
        </div>
        <div class="forge-field">
          <label for="class-hit-die-pri">Hit die priority</label>
          <input
            id="class-hit-die-pri"
            class="forge-input max-w-32"
            type="number"
            bind:value={classHitDiePriority}
          />
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="forge-field">
            <label for="class-picks-w">Talent picks warrior</label>
            <input
              id="class-picks-w"
              class="forge-input"
              type="number"
              bind:value={classTalentPicksWarrior}
            />
          </div>
          <div class="forge-field">
            <label for="class-picks-e">Talent picks expert</label>
            <input
              id="class-picks-e"
              class="forge-input"
              type="number"
              bind:value={classTalentPicksExpert}
            />
          </div>
          <div class="forge-field">
            <label for="class-picks-a">Talent picks any</label>
            <input
              id="class-picks-a"
              class="forge-input"
              type="number"
              bind:value={classTalentPicksAny}
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="forge-field">
            <label for="class-save-pri">Save primary</label>
            <select id="class-save-pri" class="forge-input" bind:value={classSavePrimary}>
              <option value="">(none)</option>
              {#each classControls.saves as s (s.slug)}
                <option value={s.slug}>{s.label} ({s.slug})</option>
              {/each}
              {#if classSavePrimary && !classControls.saves.some((s) => s.slug === classSavePrimary)}
                <option value={classSavePrimary}>{classSavePrimary} (unknown)</option>
              {/if}
            </select>
          </div>
          <div class="forge-field">
            <label for="class-save-pri-n">Priority</label>
            <input
              id="class-save-pri-n"
              class="forge-input"
              type="number"
              bind:value={classSavePrimaryPriority}
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="forge-field">
            <label for="class-save-sec">Save secondary</label>
            <select id="class-save-sec" class="forge-input" bind:value={classSaveSecondary}>
              <option value="">(none)</option>
              {#each classControls.saves as s (s.slug)}
                <option value={s.slug}>{s.label} ({s.slug})</option>
              {/each}
              {#if classSaveSecondary &&
                !classControls.saves.some((s) => s.slug === classSaveSecondary)}
                <option value={classSaveSecondary}>{classSaveSecondary} (unknown)</option>
              {/if}
            </select>
          </div>
          <div class="forge-field">
            <label for="class-save-sec-n">Priority</label>
            <input
              id="class-save-sec-n"
              class="forge-input"
              type="number"
              bind:value={classSaveSecondaryPriority}
            />
          </div>
        </div>
        <div class="forge-field">
          <label for="class-arts">Arts skill</label>
          <select id="class-arts" class="forge-input" bind:value={classArtsSkillKey}>
            <option value="">(none)</option>
            {#each classControls.skills as s (s.slug)}
              <option value={s.slug}>{s.label} ({s.slug})</option>
            {/each}
            {#if classArtsSkillKey &&
              !classControls.skills.some((s) => s.slug === classArtsSkillKey)}
              <option value={classArtsSkillKey}>{classArtsSkillKey} (unknown)</option>
            {/if}
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
        placeholder="Author notes — not translated, not shown in play"></textarea>
    </div>
  </div>

  {#if kind === "class"}
    <LinkPanel title="Linked cultures" links={cultureLinks} empty="Not linked to any culture." />
    <LinkPanel title="Talent" links={talentLinks} empty="No talent linked." />
  {/if}
</div>
