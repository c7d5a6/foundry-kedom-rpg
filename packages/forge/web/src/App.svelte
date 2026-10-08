<script lang="ts">
  import { onMount } from "svelte";
  import {
    api,
    VOCAB_KINDS,
    type Attribute,
    type Background,
    type ClassRow,
    type CompletenessItem,
    type Race,
    type Region,
    type Skill,
    type Specialization,
    type Talent,
    type Vocab,
    type VocabKind,
  } from "$lib/api";
  import BackgroundEditor from "$lib/BackgroundEditor.svelte";
  import CultureEditor from "$lib/CultureEditor.svelte";
  import RegionEditor from "$lib/RegionEditor.svelte";
  import SideBySideEditor from "$lib/SideBySideEditor.svelte";
  import TalentEditor from "$lib/TalentEditor.svelte";

  type Page =
    | "attributes"
    | "skills"
    | "regions"
    | "cultures"
    | "classes"
    | "talents"
    | "backgrounds"
    | "vocab"
    | "completeness"
    | "export";

  let page = $state<Page>("attributes");
  let loadError = $state("");
  let exportLocale = $state<"en" | "ru">("en");
  let exportPreview = $state("");
  let exportStatus = $state("");

  let attributes = $state<Attribute[]>([]);
  let selectedAttr = $state<Attribute | null>(null);

  let skills = $state<Skill[]>([]);
  let selectedSkill = $state<Skill | null>(null);
  let skillSpecs = $state<Specialization[]>([]);
  let selectedSpec = $state<Specialization | null>(null);

  let classes = $state<ClassRow[]>([]);
  let selectedClass = $state<ClassRow | null>(null);
  let newClassLabel = $state("");

  let talents = $state<Talent[]>([]);
  let selectedTalent = $state<Talent | null>(null);
  let newTalentLabel = $state("");
  let createStatus = $state("");

  let cultures = $state<Race[]>([]);
  let selectedCulture = $state<Race | null>(null);
  let newCultureLabel = $state("");

  let regions = $state<Region[]>([]);
  let selectedRegion = $state<Region | null>(null);
  let newRegionLabel = $state("");

  let backgrounds = $state<Background[]>([]);
  let selectedBackground = $state<Background | null>(null);
  let newBackgroundLabel = $state("");
  let newBackgroundFreeSkill = $state(0);
  let specsBySkill = $state<Record<number, Specialization[]>>({});

  let vocabKind = $state<VocabKind>("proficiency");
  let vocabRows = $state<Vocab[]>([]);
  let selectedVocab = $state<Vocab | null>(null);

  let completeness = $state<CompletenessItem[]>([]);
  let editorDirty = $state(false);

  function confirmLeave(): boolean {
    if (!editorDirty) return true;
    return window.confirm("You have unsaved changes. Leave without saving?");
  }

  async function loadAttributes() {
    attributes = await api.attributes();
    if (selectedAttr) {
      selectedAttr = attributes.find((a) => a.id === selectedAttr!.id) ?? attributes[0] ?? null;
    } else {
      selectedAttr = attributes[0] ?? null;
    }
  }

  async function loadSkills() {
    skills = await api.skills();
    if (selectedSkill) {
      selectedSkill = skills.find((s) => s.id === selectedSkill!.id) ?? skills[0] ?? null;
    } else {
      selectedSkill = skills[0] ?? null;
    }
    if (newBackgroundFreeSkill === 0 && skills[0]) {
      newBackgroundFreeSkill = skills[0].id;
    }
    await loadSkillSpecs();
  }

  async function loadSkillSpecs() {
    skillSpecs = [];
    if (!selectedSkill) return;
    skillSpecs = await api.skillSpecs(selectedSkill.id);
  }

  async function loadClasses() {
    classes = await api.classes();
    if (selectedClass) {
      selectedClass = classes.find((c) => c.id === selectedClass!.id) ?? classes[0] ?? null;
    } else {
      selectedClass = classes[0] ?? null;
    }
  }

  async function loadTalents() {
    talents = await api.talents();
    if (selectedTalent) {
      selectedTalent = talents.find((t) => t.id === selectedTalent!.id) ?? talents[0] ?? null;
    } else {
      selectedTalent = talents[0] ?? null;
    }
  }

  async function loadCultures() {
    cultures = await api.races();
    if (selectedCulture) {
      selectedCulture = cultures.find((c) => c.id === selectedCulture!.id) ?? cultures[0] ?? null;
    } else {
      selectedCulture = cultures[0] ?? null;
    }
  }

  async function loadRegions() {
    regions = await api.regions();
    if (selectedRegion) {
      selectedRegion = regions.find((r) => r.id === selectedRegion!.id) ?? regions[0] ?? null;
    } else {
      selectedRegion = regions[0] ?? null;
    }
  }

  async function loadBackgrounds() {
    backgrounds = await api.backgrounds();
    if (selectedBackground) {
      selectedBackground =
        backgrounds.find((b) => b.id === selectedBackground!.id) ?? backgrounds[0] ?? null;
    } else {
      selectedBackground = backgrounds[0] ?? null;
    }
  }

  async function loadSpecsForSkill(skillId: number) {
    if (skillId <= 0 || specsBySkill[skillId]) return;
    const specs = await api.skillSpecs(skillId);
    specsBySkill = { ...specsBySkill, [skillId]: specs };
  }

  async function loadVocab() {
    vocabRows = await api.vocab(vocabKind);
    if (selectedVocab) {
      selectedVocab = vocabRows.find((v) => v.id === selectedVocab!.id) ?? vocabRows[0] ?? null;
    } else {
      selectedVocab = vocabRows[0] ?? null;
    }
  }

  async function loadCompleteness() {
    completeness = await api.completeness();
  }

  async function loadExportPreview() {
    exportStatus = "";
    exportPreview = await api.exportMarkdown(exportLocale);
  }

  async function downloadExport() {
    exportStatus = "Preparing…";
    try {
      const md = await api.exportMarkdown(exportLocale);
      const name = exportLocale === "en" ? "kedom-core.md" : `kedom-core-${exportLocale}.md`;
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      exportStatus = `Downloaded ${name}`;
    } catch (e) {
      exportStatus = e instanceof Error ? e.message : String(e);
    }
  }

  /** Distinct skill(+spec) pairs for background create growth rows. */
  function defaultGrowthForCreate(freeSkillId: number): {
    roll_index: number;
    grant_kind: "skill";
    skill_id: number;
    specialization_id: number | null;
  }[] {
    const freeKey = `${freeSkillId}:`;
    const used = new Set<string>([freeKey]);
    const rows: {
      roll_index: number;
      grant_kind: "skill";
      skill_id: number;
      specialization_id: number | null;
    }[] = [];
    for (const s of skills) {
      if (rows.length >= 8) break;
      const key = `${s.id}:`;
      if (used.has(key)) continue;
      used.add(key);
      rows.push({
        roll_index: rows.length + 1,
        grant_kind: "skill",
        skill_id: s.id,
        specialization_id: null,
      });
    }
    return rows;
  }

  async function go(next: Page) {
    if (next !== page && !confirmLeave()) return;
    page = next;
    editorDirty = false;
    loadError = "";
    createStatus = "";
    try {
      if (next === "attributes") await loadAttributes();
      else if (next === "skills") {
        await loadAttributes();
        await loadSkills();
      } else if (next === "regions") {
        await Promise.all([loadRegions(), loadCultures(), loadBackgrounds()]);
      } else if (next === "cultures") {
        await Promise.all([loadCultures(), loadTalents(), loadClasses()]);
      } else if (next === "classes") {
        await Promise.all([loadClasses(), loadTalents()]);
      } else if (next === "talents") await loadTalents();
      else if (next === "backgrounds") {
        await Promise.all([loadBackgrounds(), loadSkills()]);
      } else if (next === "vocab") await loadVocab();
      else if (next === "completeness") await loadCompleteness();
      else await loadExportPreview();
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    }
  }

  function selectAttribute(a: Attribute) {
    if (selectedAttr?.id === a.id) return;
    if (!confirmLeave()) return;
    selectedAttr = a;
  }

  async function selectSkill(s: Skill) {
    if (selectedSkill?.id === s.id && !selectedSpec) return;
    if (!confirmLeave()) return;
    selectedSkill = s;
    selectedSpec = null;
    await loadSkillSpecs();
  }

  function selectSpec(sp: Specialization) {
    if (selectedSpec?.id === sp.id) return;
    if (!confirmLeave()) return;
    selectedSpec = sp;
  }

  function selectClass(c: ClassRow) {
    if (selectedClass?.id === c.id) return;
    if (!confirmLeave()) return;
    selectedClass = c;
  }

  function selectTalent(t: Talent) {
    if (selectedTalent?.id === t.id) return;
    if (!confirmLeave()) return;
    selectedTalent = t;
  }

  function selectCulture(c: Race) {
    if (selectedCulture?.id === c.id) return;
    if (!confirmLeave()) return;
    selectedCulture = c;
  }

  function selectRegion(r: Region) {
    if (selectedRegion?.id === r.id) return;
    if (!confirmLeave()) return;
    selectedRegion = r;
  }

  function selectBackground(b: Background) {
    if (selectedBackground?.id === b.id) return;
    if (!confirmLeave()) return;
    selectedBackground = b;
  }

  function selectVocab(v: Vocab) {
    if (selectedVocab?.id === v.id) return;
    if (!confirmLeave()) return;
    selectedVocab = v;
  }

  async function createClass() {
    const label = newClassLabel.trim();
    if (!label) return;
    createStatus = "Creating…";
    try {
      const created = await api.createClass({ label });
      newClassLabel = "";
      createStatus = `Created ${created.slug}`;
      await loadClasses();
      selectedClass = created;
    } catch (e) {
      createStatus = e instanceof Error ? e.message : String(e);
    }
  }

  async function createTalent() {
    const label = newTalentLabel.trim();
    if (!label) return;
    createStatus = "Creating…";
    try {
      const created = await api.createTalent({ label });
      newTalentLabel = "";
      createStatus = `Created ${created.slug}`;
      await loadTalents();
      selectedTalent = created;
    } catch (e) {
      createStatus = e instanceof Error ? e.message : String(e);
    }
  }

  async function afterDeleted(
    clear: () => void,
    reload: () => Promise<void>,
  ): Promise<void> {
    clear();
    editorDirty = false;
    await reload();
  }

  async function createCulture() {
    const label = newCultureLabel.trim();
    if (!label) return;
    createStatus = "Creating…";
    try {
      const created = await api.createRace({ label, class_ids: [] });
      newCultureLabel = "";
      createStatus = `Created ${created.slug}`;
      await loadCultures();
      selectedCulture = created;
    } catch (e) {
      createStatus = e instanceof Error ? e.message : String(e);
    }
  }

  async function createRegion() {
    const label = newRegionLabel.trim();
    if (!label) return;
    createStatus = "Creating…";
    try {
      const created = await api.createRegion({ label, cultures: [], backgrounds: [] });
      newRegionLabel = "";
      createStatus = `Created ${created.slug}`;
      await loadRegions();
      selectedRegion = created;
    } catch (e) {
      createStatus = e instanceof Error ? e.message : String(e);
    }
  }

  async function createBackground() {
    const label = newBackgroundLabel.trim();
    if (!label || !newBackgroundFreeSkill) return;
    const growth = defaultGrowthForCreate(Number(newBackgroundFreeSkill));
    if (growth.length !== 8) {
      createStatus = "Need at least 9 distinct skills (free + 8 growth rows).";
      return;
    }
    createStatus = "Creating…";
    try {
      const created = await api.createBackground({
        label,
        free_grant_kind: "skill",
        free_skill_id: Number(newBackgroundFreeSkill),
        free_specialization_id: null,
        free_specialization_label: "",
        growth,
      });
      newBackgroundLabel = "";
      createStatus = `Created ${created.slug}`;
      await loadBackgrounds();
      selectedBackground = created;
    } catch (e) {
      createStatus = e instanceof Error ? e.message : String(e);
    }
  }

  onMount(() => {
    void go("attributes");
  });
</script>

<div class="grid min-h-screen grid-cols-[13rem_1fr]">
  <nav class="border-r border-line bg-raised/95">
    <div class="px-3 pt-3 pb-2">
      <p class="font-display text-3xl leading-none tracking-tight text-ink">Kedom</p>
      <p class="mt-0.5 text-xs tracking-[0.18em] text-muted uppercase">Forge</p>
    </div>
    <div class="flex flex-col gap-0.5 px-2 pb-2">
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "attributes"}
        onclick={() => go("attributes")}>Attributes</button
      >
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "skills"}
        onclick={() => go("skills")}>Skills</button
      >
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "regions"}
        onclick={() => go("regions")}>Regions</button
      >
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "cultures"}
        onclick={() => go("cultures")}>Cultures</button
      >
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "classes"}
        onclick={() => go("classes")}>Classes</button
      >
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "talents"}
        onclick={() => go("talents")}>Talents</button
      >
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "backgrounds"}
        onclick={() => go("backgrounds")}>Backgrounds</button
      >
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "vocab"}
        onclick={() => go("vocab")}>Vocabulary</button
      >
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "completeness"}
        onclick={() => go("completeness")}>Completeness</button
      >
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "export"}
        onclick={() => go("export")}>Export MD</button
      >
    </div>
  </nav>

  <main class="px-5 py-3">
    {#if loadError}
      <p class="forge-panel mb-3 px-3 py-2 text-sm text-danger">
        API error: {loadError}. Is <code class="font-mono">npm run forge:api</code> running on :7777?
      </p>
    {/if}

    {#if page === "attributes"}
      <div class="grid grid-cols-[14rem_1fr] gap-3">
        <div class="forge-panel max-h-[calc(100vh-1.5rem)] overflow-auto">
          {#each attributes as a (a.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedAttr?.id === a.id}
              onclick={() => selectAttribute(a)}
            >
              <span class="block font-medium">{a.label}</span>
              <span class="mt-0.5 block font-mono text-xs text-muted">{a.slug}</span>
            </button>
          {/each}
        </div>
        {#if selectedAttr}
          <SideBySideEditor
            kind="attribute"
            id={selectedAttr.id}
            slug={selectedAttr.slug}
            showAbbreviation={true}
            en={{
              label: selectedAttr.label,
              abbreviation: selectedAttr.abbreviation,
              description: selectedAttr.description,
              comment: selectedAttr.comment,
              sort_order: selectedAttr.sort_order,
            }}
            translations={selectedAttr.translations ?? {}}
            onSaved={loadAttributes}
            onDirtyChange={(d) => (editorDirty = d)}
          />
        {/if}
      </div>
    {:else if page === "skills"}
      <div class="grid grid-cols-[16rem_1fr] gap-3">
        <div class="forge-panel max-h-[calc(100vh-1.5rem)] overflow-auto">
          {#each skills as s (s.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedSkill?.id === s.id && !selectedSpec}
              onclick={() => void selectSkill(s)}
            >
              <span class="block font-medium">{s.label}</span>
              <span class="mt-0.5 block font-mono text-xs text-muted"
                >{s.slug} · {s.attribute_slug} · {s.specialization_mode}</span
              >
            </button>
            {#if selectedSkill?.id === s.id && skillSpecs.length > 0}
              <div class="ml-2 border-l-2 border-line py-0.5 pl-1.5">
                {#each skillSpecs as sp (sp.id)}
                  <button
                    type="button"
                    class="forge-list-btn rounded-md border-0"
                    data-active={selectedSpec?.id === sp.id}
                    onclick={() => selectSpec(sp)}
                  >
                    <span class="block text-sm">{sp.label}</span>
                    <span class="block font-mono text-[0.7rem] text-muted">{sp.slug}</span>
                  </button>
                {/each}
              </div>
            {/if}
          {/each}
        </div>
        {#if selectedSpec}
          <SideBySideEditor
            kind="specialization"
            id={selectedSpec.id}
            slug={selectedSpec.slug}
            en={{
              label: selectedSpec.label,
              description: selectedSpec.description,
              comment: selectedSpec.comment,
              sort_order: selectedSpec.sort_order,
            }}
            translations={selectedSpec.translations ?? {}}
            onSaved={async () => {
              await loadSkillSpecs();
              if (selectedSpec) {
                selectedSpec = skillSpecs.find((x) => x.id === selectedSpec!.id) ?? null;
              }
            }}
            onDirtyChange={(d) => (editorDirty = d)}
          />
        {:else if selectedSkill}
          <SideBySideEditor
            kind="skill"
            id={selectedSkill.id}
            slug={selectedSkill.slug}
            en={{
              label: selectedSkill.label,
              description: selectedSkill.description,
              comment: selectedSkill.comment,
              sort_order: selectedSkill.sort_order,
            }}
            translations={selectedSkill.translations ?? {}}
            skillControls={{
              attribute_id: selectedSkill.attribute_id,
              specialization_mode: selectedSkill.specialization_mode,
              attributes: attributes.map((a) => ({
                id: a.id,
                slug: a.slug,
                label: a.label,
              })),
            }}
            onSaved={loadSkills}
            onDirtyChange={(d) => (editorDirty = d)}
          />
        {/if}
      </div>
    {:else if page === "regions"}
      <div class="grid grid-cols-[14rem_1fr] gap-3">
        <div class="forge-panel max-h-[calc(100vh-1.5rem)] overflow-auto">
          <div class="border-b border-line p-2">
            <div class="forge-field mb-1">
              <label for="new-region">New region</label>
              <input
                id="new-region"
                class="forge-input"
                bind:value={newRegionLabel}
                placeholder="Label"
                onkeydown={(ev) => {
                  if (ev.key === "Enter") void createRegion();
                }}
              />
            </div>
            <button
              type="button"
              class="forge-btn forge-btn-primary w-full"
              disabled={!newRegionLabel.trim()}
              onclick={() => void createRegion()}>Create</button
            >
            {#if createStatus}
              <p class="mt-1 font-mono text-xs text-muted">{createStatus}</p>
            {/if}
          </div>
          {#each regions as r (r.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedRegion?.id === r.id}
              onclick={() => selectRegion(r)}
            >
              <span class="block font-medium">{r.label}</span>
              <span class="mt-0.5 block font-mono text-xs text-muted">{r.slug}</span>
            </button>
          {/each}
        </div>
        {#if selectedRegion}
          <RegionEditor
            region={selectedRegion}
            {cultures}
            {backgrounds}
            onSaved={loadRegions}
            onDeleted={() =>
              afterDeleted(() => {
                selectedRegion = null;
              }, loadRegions)}
            onDirtyChange={(d) => (editorDirty = d)}
          />
        {/if}
      </div>
    {:else if page === "cultures"}
      <div class="grid grid-cols-[14rem_1fr] gap-3">
        <div class="forge-panel max-h-[calc(100vh-1.5rem)] overflow-auto">
          <div class="border-b border-line p-2">
            <div class="forge-field mb-1">
              <label for="new-culture">New culture</label>
              <input
                id="new-culture"
                class="forge-input"
                bind:value={newCultureLabel}
                placeholder="Label"
                onkeydown={(ev) => {
                  if (ev.key === "Enter") void createCulture();
                }}
              />
            </div>
            <button
              type="button"
              class="forge-btn forge-btn-primary w-full"
              disabled={!newCultureLabel.trim()}
              onclick={() => void createCulture()}>Create</button
            >
            {#if createStatus}
              <p class="mt-1 font-mono text-xs text-muted">{createStatus}</p>
            {/if}
          </div>
          {#each cultures as c (c.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedCulture?.id === c.id}
              onclick={() => selectCulture(c)}
            >
              <span class="block font-medium">{c.label}</span>
              <span class="mt-0.5 block font-mono text-xs text-muted">{c.slug}</span>
            </button>
          {/each}
        </div>
        {#if selectedCulture}
          <CultureEditor
            culture={selectedCulture}
            {talents}
            {classes}
            onSaved={loadCultures}
            onDeleted={() =>
              afterDeleted(() => {
                selectedCulture = null;
              }, loadCultures)}
            onDirtyChange={(d) => (editorDirty = d)}
          />
        {/if}
      </div>
    {:else if page === "classes"}
      <div class="grid grid-cols-[14rem_1fr] gap-3">
        <div class="forge-panel max-h-[calc(100vh-1.5rem)] overflow-auto">
          <div class="border-b border-line p-2">
            <div class="forge-field mb-1">
              <label for="new-class">New class</label>
              <input
                id="new-class"
                class="forge-input"
                bind:value={newClassLabel}
                placeholder="Label"
                onkeydown={(ev) => {
                  if (ev.key === "Enter") void createClass();
                }}
              />
            </div>
            <button
              type="button"
              class="forge-btn forge-btn-primary w-full"
              disabled={!newClassLabel.trim()}
              onclick={() => void createClass()}>Create</button
            >
            {#if createStatus}
              <p class="mt-1 font-mono text-xs text-muted">{createStatus}</p>
            {/if}
          </div>
          {#each classes as c (c.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedClass?.id === c.id}
              onclick={() => selectClass(c)}
            >
              <span class="block font-medium">{c.label}</span>
              <span class="mt-0.5 block font-mono text-xs text-muted"
                >{c.slug}{#if c.is_full}
                  · full{/if}{#if c.is_partial}
                  · partial{/if}</span
              >
            </button>
          {/each}
        </div>
        {#if selectedClass}
          <SideBySideEditor
            kind="class"
            id={selectedClass.id}
            slug={selectedClass.slug}
            en={{
              label: selectedClass.label,
              description: selectedClass.description,
              comment: selectedClass.comment,
              sort_order: selectedClass.sort_order,
            }}
            translations={selectedClass.translations ?? {}}
            classControls={{
              hit_die: selectedClass.hit_die ?? "",
              talent_id: selectedClass.talent_id,
              hit_die_priority: selectedClass.hit_die_priority,
              talent_picks_warrior: selectedClass.talent_picks_warrior,
              talent_picks_expert: selectedClass.talent_picks_expert,
              talent_picks_any: selectedClass.talent_picks_any,
              save_primary: selectedClass.save_primary ?? "",
              save_primary_priority: selectedClass.save_primary_priority,
              save_secondary: selectedClass.save_secondary ?? "",
              save_secondary_priority: selectedClass.save_secondary_priority,
              arts_skill_key: selectedClass.arts_skill_key ?? "",
              class_talent_keys: selectedClass.class_talent_keys ?? "[]",
              talents: talents.map((t) => ({ id: t.id, slug: t.slug, label: t.label })),
            }}
            linkedCultures={selectedClass.linked_cultures ?? []}
            onSaved={loadClasses}
            onDeleted={() =>
              afterDeleted(() => {
                selectedClass = null;
              }, loadClasses)}
            onDirtyChange={(d) => (editorDirty = d)}
          />
        {/if}
      </div>
    {:else if page === "talents"}
      <div class="grid grid-cols-[14rem_1fr] gap-3">
        <div class="forge-panel max-h-[calc(100vh-1.5rem)] overflow-auto">
          <div class="border-b border-line p-2">
            <div class="forge-field mb-1">
              <label for="new-talent">New talent</label>
              <input
                id="new-talent"
                class="forge-input"
                bind:value={newTalentLabel}
                placeholder="Label"
                onkeydown={(ev) => {
                  if (ev.key === "Enter") void createTalent();
                }}
              />
            </div>
            <button
              type="button"
              class="forge-btn forge-btn-primary w-full"
              disabled={!newTalentLabel.trim()}
              onclick={() => void createTalent()}>Create</button
            >
            {#if createStatus}
              <p class="mt-1 font-mono text-xs text-muted">{createStatus}</p>
            {/if}
          </div>
          {#each talents as t (t.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedTalent?.id === t.id}
              onclick={() => selectTalent(t)}
            >
              <span class="block font-medium">{t.label}</span>
              <span class="mt-0.5 block font-mono text-xs text-muted">{t.slug} · {t.category}</span>
            </button>
          {/each}
        </div>
        {#if selectedTalent}
          <TalentEditor
            talent={selectedTalent}
            onSaved={loadTalents}
            onDeleted={() =>
              afterDeleted(() => {
                selectedTalent = null;
              }, loadTalents)}
            onDirtyChange={(d) => (editorDirty = d)}
          />
        {/if}
      </div>
    {:else if page === "backgrounds"}
      <div class="grid grid-cols-[14rem_1fr] gap-3">
        <div class="forge-panel max-h-[calc(100vh-1.5rem)] overflow-auto">
          <div class="border-b border-line p-2">
            <div class="forge-field mb-1">
              <label for="new-bg">New background</label>
              <input
                id="new-bg"
                class="forge-input"
                bind:value={newBackgroundLabel}
                placeholder="Label"
              />
            </div>
            <div class="forge-field mb-1">
              <label for="new-bg-skill">Free skill</label>
              <select id="new-bg-skill" class="forge-input" bind:value={newBackgroundFreeSkill}>
                {#each skills as s (s.id)}
                  <option value={s.id}>{s.label}</option>
                {/each}
              </select>
            </div>
            <button
              type="button"
              class="forge-btn forge-btn-primary w-full"
              disabled={!newBackgroundLabel.trim() || !newBackgroundFreeSkill}
              onclick={() => void createBackground()}>Create</button
            >
            {#if createStatus}
              <p class="mt-1 font-mono text-xs text-muted">{createStatus}</p>
            {/if}
          </div>
          {#each backgrounds as b (b.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedBackground?.id === b.id}
              onclick={() => selectBackground(b)}
            >
              <span class="block font-medium">{b.label}</span>
              <span class="mt-0.5 block font-mono text-xs text-muted">{b.slug}</span>
            </button>
          {/each}
        </div>
        {#if selectedBackground}
          <BackgroundEditor
            background={selectedBackground}
            {skills}
            {specsBySkill}
            loadSpecs={loadSpecsForSkill}
            onSaved={loadBackgrounds}
            onDeleted={() =>
              afterDeleted(() => {
                selectedBackground = null;
              }, loadBackgrounds)}
            onDirtyChange={(d) => (editorDirty = d)}
          />
        {/if}
      </div>
    {:else if page === "vocab"}
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <label class="text-xs tracking-wide text-muted uppercase" for="vocab-kind">Kind</label>
        <select
          id="vocab-kind"
          class="forge-input w-auto py-1"
          value={vocabKind}
          onchange={(ev) => {
            const next = (ev.currentTarget as HTMLSelectElement).value as VocabKind;
            if (!confirmLeave()) {
              ev.currentTarget.value = vocabKind;
              return;
            }
            vocabKind = next;
            selectedVocab = null;
            void loadVocab();
          }}
        >
          {#each VOCAB_KINDS as k (k.kind)}
            <option value={k.kind}>{k.label}</option>
          {/each}
        </select>
        <p class="text-sm text-muted">
          Closed-vocab labels for Foundry <code class="font-mono">lang/*.json</code>.
        </p>
      </div>
      <div class="grid grid-cols-[14rem_1fr] gap-3">
        <div class="forge-panel max-h-[calc(100vh-4.5rem)] overflow-auto">
          {#each vocabRows as v (v.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedVocab?.id === v.id}
              onclick={() => selectVocab(v)}
            >
              <span class="block font-medium">{v.label}</span>
              <span class="mt-0.5 block font-mono text-xs text-muted">{v.slug}</span>
            </button>
          {/each}
        </div>
        {#if selectedVocab}
          <SideBySideEditor
            kind={selectedVocab.kind}
            id={selectedVocab.id}
            slug={selectedVocab.slug}
            showAbbreviation={selectedVocab.abbreviation !== ""}
            showDescription={false}
            en={{
              label: selectedVocab.label,
              abbreviation: selectedVocab.abbreviation,
              comment: selectedVocab.comment,
              sort_order: selectedVocab.sort_order,
            }}
            translations={selectedVocab.translations ?? {}}
            onSaved={loadVocab}
            onDirtyChange={(d) => (editorDirty = d)}
          />
        {/if}
      </div>
    {:else if page === "export"}
      <div class="forge-panel overflow-hidden">
        <div class="flex flex-wrap items-end justify-between gap-2 border-b border-line px-3 py-2">
          <div>
            <h2 class="font-display text-xl">Markdown export</h2>
            <p class="mt-0.5 text-sm text-muted">
              Barebones rulebook from current Forge content. Comments are omitted.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-xs tracking-wide text-muted uppercase" for="export-locale"
              >Locale</label
            >
            <select
              id="export-locale"
              class="forge-input w-auto py-1"
              bind:value={exportLocale}
              onchange={() => void loadExportPreview()}
            >
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
            <button
              type="button"
              class="forge-btn forge-btn-primary"
              onclick={() => void downloadExport()}>Download</button
            >
            <button type="button" class="forge-btn" onclick={() => void loadExportPreview()}
              >Refresh</button
            >
          </div>
        </div>
        {#if exportStatus}
          <p class="border-b border-line px-3 py-1.5 text-sm text-muted">{exportStatus}</p>
        {/if}
        <pre
          class="max-h-[calc(100vh-9rem)] overflow-auto bg-sunken/30 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink">{exportPreview}</pre>
      </div>
    {:else}
      <div class="forge-panel overflow-hidden">
        <div class="border-b border-line px-3 py-2">
          <h2 class="font-display text-xl">Completeness</h2>
          <p class="mt-0.5 text-sm text-muted">
            Missing Russian fields (empty English descriptions are not required yet).
          </p>
        </div>
        {#if completeness.length === 0}
          <p class="px-3 py-4 text-ok">Nothing missing for the tracked fields.</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead class="bg-sunken/40 text-left text-muted">
                <tr>
                  <th class="px-3 py-1.5 font-medium">Kind</th>
                  <th class="px-3 py-1.5 font-medium">Slug</th>
                  <th class="px-3 py-1.5 font-medium">English</th>
                  <th class="px-3 py-1.5 font-medium">Missing</th>
                </tr>
              </thead>
              <tbody>
                {#each completeness as row (row.entity_kind + row.entity_id)}
                  <tr class="border-t border-line">
                    <td class="px-3 py-1.5">{row.entity_kind}</td>
                    <td class="px-3 py-1.5"><code class="font-mono text-xs">{row.slug}</code></td>
                    <td class="px-3 py-1.5">{row.label}</td>
                    <td class="px-3 py-1.5 text-warn">{row.missing.join(", ")}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>
