<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import {
    ART_COMMITMENTS,
    api,
    type Art,
    type ClassRow,
    type TranslationField,
  } from "$lib/api";
  import RichTextField from "$lib/RichTextField.svelte";

  const EFFECT_MODES = ["add", "subtract", "multiply", "override", "upgrade", "downgrade"] as const;

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
    art: Art;
    classes: ClassRow[];
    onSaved: () => void | Promise<void>;
    onDeleted?: () => void | Promise<void>;
    onDirtyChange?: (dirty: boolean) => void;
  };

  let { art, classes, onSaved, onDeleted, onDirtyChange }: Props = $props();

  let enLabel = $state("");
  let enDesc = $state("");
  let enComment = $state("");
  let enSort = $state(0);
  let classId = $state(0);
  let commitment = $state("scene");
  let effects = $state<EffectDraft[]>([]);
  let ruLabel = $state("");
  let ruDesc = $state("");
  let status = $state("");
  let error = $state(false);

  type Baseline = {
    enLabel: string;
    enComment: string;
    enSort: number;
    classId: number;
    commitment: string;
    effectsJson: string;
    ruLabel: string;
  };

  let baseline = $state<Baseline>({
    enLabel: "",
    enComment: "",
    enSort: 0,
    classId: 0,
    commitment: "scene",
    effectsJson: "[]",
    ruLabel: "",
  });

  function snapshotFromProps(): Baseline {
    return {
      enLabel: art.label,
      enComment: art.comment ?? "",
      enSort: art.sort_order,
      classId: art.class_id,
      commitment: art.commitment || "scene",
      effectsJson: effectsPayload(parseEffects(art.effects_json)),
      ruLabel: art.translations?.label ?? "",
    };
  }

  function applyBaseline(b: Baseline) {
    enLabel = b.enLabel;
    enComment = b.enComment;
    enSort = b.enSort;
    classId = b.classId;
    commitment = b.commitment;
    effects = parseEffects(b.effectsJson);
    ruLabel = b.ruLabel;
  }

  function resetFromProps() {
    const b = snapshotFromProps();
    baseline = b;
    applyBaseline(b);
    enDesc = art.description ?? "";
    ruDesc = art.translations?.description ?? "";
    status = "";
    error = false;
  }

  $effect(() => {
    void art.id;
    untrack(() => resetFromProps());
  });

  const dirty = $derived(
    enLabel !== baseline.enLabel ||
      enComment !== baseline.enComment ||
      enSort !== baseline.enSort ||
      classId !== baseline.classId ||
      commitment !== baseline.commitment ||
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
        entity_kind: "art",
        entity_id: art.id,
        locale: "ru",
        field,
      });
      return;
    }
    await api.putTranslation({
      entity_kind: "art",
      entity_id: art.id,
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
      const saved = await api.patchArt(art.id, {
        label: enLabel,
        description: enDesc,
        comment: enComment,
        class_id: Number(classId),
        commitment,
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
        classId: Number(classId),
        commitment,
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
    const saved = await api.patchArt(art.id, {
      label: art.label,
      description: markdown,
      comment: art.comment,
      class_id: art.class_id,
      commitment: art.commitment || "scene",
      effects_json: effectsPayload(effects),
      sort_order: art.sort_order,
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
    if (!window.confirm(`Delete art “${art.label}”?`)) return;
    error = false;
    status = "Deleting…";
    try {
      await api.deleteArt(art.id);
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
      <p class="font-display text-2xl leading-none text-ink">{enLabel || art.slug}</p>
      <p class="mt-0.5 font-mono text-xs text-muted">
        {art.slug} · art #{art.id}
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
        <label for="art-en-label">Label</label>
        <input id="art-en-label" class="forge-input" bind:value={enLabel} />
      </div>
      {#key `art-en-desc-${art.id}`}
        <RichTextField
          label="Description"
          value={enDesc}
          placeholder="(no description yet)"
          onSave={saveEnDescription}
        />
      {/key}
      <div class="forge-field">
        <label for="art-class">Class</label>
        <select id="art-class" class="forge-input" bind:value={classId}>
          {#each classes as c (c.id)}
            <option value={c.id}>{c.label} ({c.slug})</option>
          {/each}
        </select>
      </div>
      <div class="forge-field">
        <label for="art-commitment">Commitment</label>
        <select id="art-commitment" class="forge-input" bind:value={commitment}>
          {#each ART_COMMITMENTS as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </div>
      <div class="forge-field">
        <label for="art-sort">Sort order</label>
        <input id="art-sort" class="forge-input max-w-32" type="number" bind:value={enSort} />
      </div>
    </section>

    <section>
      <h3 class="mb-2 font-display text-lg text-ink">Русский</h3>
      <div class="forge-field">
        <label for="art-ru-label">Label</label>
        <input
          id="art-ru-label"
          class="forge-input"
          bind:value={ruLabel}
          placeholder="(empty = fall back to English)"
        />
      </div>
      {#key `art-ru-desc-${art.id}`}
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
      <label for="art-comment"
        >Comment <span class="normal-case tracking-normal text-muted">(all languages)</span></label
      >
      <textarea
        id="art-comment"
        class="forge-input min-h-16 resize-y"
        bind:value={enComment}
        placeholder="Author notes — not translated, not shown in play"></textarea>
    </div>
  </div>

  <section class="mt-2 border-t border-line pt-3">
    <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="font-display text-lg text-ink">Effects</h3>
      <button type="button" class="forge-btn" onclick={addEffect}>Add effect</button>
    </div>
    {#if effects.length === 0}
      <p class="text-sm text-muted">No effects yet.</p>
    {/if}
    <div class="flex flex-col gap-3">
      {#each effects as effect (effect.clientKey)}
        <div class="border border-line p-2">
          <div class="mb-2 flex flex-wrap items-end gap-2">
            <div class="forge-field mb-0 min-w-48 flex-1">
              <label for={"art-effect-name-" + effect.clientKey}>Name</label>
              <input
                id={"art-effect-name-" + effect.clientKey}
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
                  <label for={"art-effect-key-" + effect.clientKey + "-" + index}>Key</label>
                  <input
                    id={"art-effect-key-" + effect.clientKey + "-" + index}
                    class="forge-input font-mono text-xs"
                    bind:value={change.key}
                  />
                </div>
                <div class="forge-field mb-0">
                  <label for={"art-effect-mode-" + effect.clientKey + "-" + index}>Mode</label>
                  <select
                    id={"art-effect-mode-" + effect.clientKey + "-" + index}
                    class="forge-input"
                    bind:value={change.mode}
                  >
                    {#each EFFECT_MODES as mode}
                      <option value={mode}>{mode}</option>
                    {/each}
                  </select>
                </div>
                <div class="forge-field mb-0">
                  <label for={"art-effect-value-" + effect.clientKey + "-" + index}>Value</label>
                  <input
                    id={"art-effect-value-" + effect.clientKey + "-" + index}
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
  </section>
</div>
