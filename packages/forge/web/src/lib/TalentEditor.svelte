<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import {
    TALENT_CATEGORIES,
    api,
    type Talent,
    type TranslationField,
  } from "$lib/api";
  import RichTextField from "$lib/RichTextField.svelte";
  import LinkPanel from "$lib/LinkPanel.svelte";

  const EFFECT_MODES = ["add", "subtract", "multiply", "override", "upgrade", "downgrade"] as const;

  const SUGGESTED_EFFECT_KEYS = [
    "system.skills.stab.attackMod",
    "system.skills.punch.attackMod",
    "system.skills.shoot.attackMod",
    "system.skills.stab.damageMod",
    "system.skills.punch.damageMod",
    "system.skills.shoot.damageMod",
    "system.combat.meleeDamageBonus",
    "system.skills.heal.defaultAdvantage",
  ];

  type EffectChangeDraft = {
    key: string;
    mode: string;
    value: string;
    priority: number;
  };

  type EffectDraft = {
    clientKey: string;
    foundryId: string;
    name: string;
    img: string;
    disabled: boolean;
    changes: EffectChangeDraft[];
  };

  let effectSeq = 0;

  function parseEffects(raw: string | undefined): EffectDraft[] {
    let parsed: unknown = [];
    try {
      parsed = JSON.parse(raw || "[]");
    } catch {
      parsed = [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const e = (item ?? {}) as Record<string, unknown>;
      const changes = Array.isArray(e.changes) ? e.changes : [];
      effectSeq += 1;
      return {
        clientKey: `e${effectSeq}`,
        foundryId: typeof e.foundryId === "string" ? e.foundryId : "",
        name: typeof e.name === "string" ? e.name : "",
        img: typeof e.img === "string" && e.img ? e.img : "icons/svg/aura.svg",
        disabled: e.disabled === true,
        changes: changes.map((c) => {
          const ch = (c ?? {}) as Record<string, unknown>;
          return {
            key: typeof ch.key === "string" ? ch.key : "",
            mode: typeof ch.mode === "string" ? ch.mode : "add",
            value: typeof ch.value === "string" ? ch.value : "",
            priority: typeof ch.priority === "number" ? ch.priority : 20,
          };
        }),
      };
    });
  }

  function effectsPayload(drafts: EffectDraft[]): string {
    return JSON.stringify(
      drafts.map((e) => ({
        foundryId: e.foundryId,
        name: e.name,
        img: e.img || "icons/svg/aura.svg",
        disabled: e.disabled,
        changes: e.changes.map((c) => ({
          key: c.key,
          mode: c.mode,
          value: c.value,
          priority: c.priority,
        })),
      })),
    );
  }

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
  let grantsJson = $state("");
  let effects = $state<EffectDraft[]>([]);
  let ruLabel = $state("");
  let ruDesc = $state("");
  let status = $state("");
  let error = $state(false);

  type Baseline = {
    enLabel: string;
    enComment: string;
    enSort: number;
    category: string;
    grantsJson: string;
    effectsJson: string;
    ruLabel: string;
  };

  let baseline = $state<Baseline>({
    enLabel: "",
    enComment: "",
    enSort: 0,
    category: "general",
    grantsJson: "",
    effectsJson: "[]",
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
      grantsJson: talent.grants_json ?? "",
      effectsJson: effectsPayload(parseEffects(talent.effects_json)),
      ruLabel: talent.translations?.label ?? "",
    };
  }

  function applyBaseline(b: Baseline) {
    enLabel = b.enLabel;
    enComment = b.enComment;
    enSort = b.enSort;
    category = b.category;
    grantsJson = b.grantsJson;
    effects = parseEffects(b.effectsJson);
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
      grantsJson !== baseline.grantsJson ||
      effectsPayload(effects) !== baseline.effectsJson ||
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
      const saved = await api.patchTalent(talent.id, {
        label: enLabel,
        description: enDesc,
        comment: enComment,
        category,
        grants_json: grantsJson,
        effects_json: effectsPayload(effects),
        sort_order: enSort,
      });
      effects = parseEffects(saved.effects_json);
      await saveOverlay("label", ruLabel);
      status = "Saved";
      await onSaved();
      baseline = {
        enLabel,
        enComment,
        enSort,
        category,
        grantsJson,
        effectsJson: effectsPayload(effects),
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
    const saved = await api.patchTalent(talent.id, {
      label: talent.label,
      description: markdown,
      comment: talent.comment,
      category: talent.category,
      grants_json: talent.grants_json,
      effects_json: effectsPayload(effects),
      sort_order: talent.sort_order,
    });
    effects = parseEffects(saved.effects_json);
    baseline = { ...baseline, effectsJson: effectsPayload(effects) };
    enDesc = markdown;
    await onSaved();
  }

  async function saveRuDescription(markdown: string) {
    await saveOverlay("description", markdown);
    ruDesc = markdown;
    await onSaved();
  }

  function addEffect() {
    effectSeq += 1;
    effects = [
      ...effects,
      {
        clientKey: `e${effectSeq}`,
        foundryId: "",
        name: "Effect",
        img: "icons/svg/aura.svg",
        disabled: false,
        changes: [],
      },
    ];
  }

  function removeEffect(clientKey: string) {
    effects = effects.filter((e) => e.clientKey !== clientKey);
  }

  function addChange(clientKey: string) {
    effects = effects.map((e) =>
      e.clientKey === clientKey
        ? {
            ...e,
            changes: [...e.changes, { key: "", mode: "add", value: "", priority: 20 }],
          }
        : e,
    );
  }

  function removeChange(clientKey: string, index: number) {
    effects = effects.map((e) =>
      e.clientKey === clientKey
        ? { ...e, changes: e.changes.filter((_, i) => i !== index) }
        : e,
    );
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

  <section class="mt-2 border-t border-line pt-3">
    <div class="mb-2 flex items-baseline justify-between gap-2">
      <h3 class="font-display text-lg text-ink">Effects</h3>
      <button type="button" class="forge-btn" onclick={addEffect}>Add effect</button>
    </div>
    <p class="mb-2 text-sm text-muted">
      Each effect is a transferable Active Effect. Change keys are actor paths. Weapon rolls read
      stab, punch, and shoot <span class="font-mono">attackMod</span> and
      <span class="font-mono">damageMod</span>. A value may be a number or a formula such as
      <span class="font-mono">max(@skills.stab.proficiencyBonus, 0)</span>.
    </p>
    {#if effects.length === 0}
      <p class="text-sm text-muted">No effects yet.</p>
    {/if}
    <div class="flex flex-col gap-3">
      {#each effects as effect (effect.clientKey)}
        <div class="border border-line p-2">
          <div class="mb-2 flex flex-wrap items-end gap-2">
            <div class="forge-field mb-0 min-w-48 flex-1">
              <label for={"effect-name-" + effect.clientKey}>Name</label>
              <input
                id={"effect-name-" + effect.clientKey}
                class="forge-input"
                bind:value={effect.name}
              />
            </div>
            <label class="mb-1 flex items-center gap-1 text-sm text-ink">
              <input type="checkbox" bind:checked={effect.disabled} />
              Disabled
            </label>
            <button
              type="button"
              class="forge-btn text-danger"
              onclick={() => removeEffect(effect.clientKey)}>Remove effect</button
            >
          </div>
          <div class="flex flex-col gap-2">
            {#each effect.changes as change, index (effect.clientKey + "-" + index)}
              <div class="grid grid-cols-[minmax(0,1.4fr)_8rem_minmax(0,1fr)_auto] items-end gap-2">
                <div class="forge-field mb-0">
                  <label for={"effect-key-" + effect.clientKey + "-" + index}>Key</label>
                  <input
                    id={"effect-key-" + effect.clientKey + "-" + index}
                    class="forge-input font-mono text-xs"
                    list="talent-effect-keys"
                    bind:value={change.key}
                  />
                </div>
                <div class="forge-field mb-0">
                  <label for={"effect-mode-" + effect.clientKey + "-" + index}>Mode</label>
                  <select
                    id={"effect-mode-" + effect.clientKey + "-" + index}
                    class="forge-input"
                    bind:value={change.mode}
                  >
                    {#each EFFECT_MODES as mode}
                      <option value={mode}>{mode}</option>
                    {/each}
                  </select>
                </div>
                <div class="forge-field mb-0">
                  <label for={"effect-value-" + effect.clientKey + "-" + index}>Value</label>
                  <input
                    id={"effect-value-" + effect.clientKey + "-" + index}
                    class="forge-input font-mono text-xs"
                    bind:value={change.value}
                  />
                </div>
                <button
                  type="button"
                  class="forge-btn text-danger"
                  onclick={() => removeChange(effect.clientKey, index)}>Remove</button
                >
              </div>
            {/each}
          </div>
          <button type="button" class="forge-btn mt-2" onclick={() => addChange(effect.clientKey)}
            >Add change</button
          >
        </div>
      {/each}
    </div>
    <datalist id="talent-effect-keys">
      {#each SUGGESTED_EFFECT_KEYS as key}
        <option value={key}></option>
      {/each}
    </datalist>
  </section>

  <LinkPanel title="Linked cultures" links={cultureLinks} empty="Not linked to any culture." />
  <LinkPanel title="Linked classes" links={classLinks} empty="Not linked to any class." />
</div>
