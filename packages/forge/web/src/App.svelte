<script lang="ts">
  import { onMount } from "svelte";
  import {
    api,
    VOCAB_KINDS,
    type Attribute,
    type ClassRow,
    type CompletenessItem,
    type Skill,
    type Specialization,
    type Vocab,
    type VocabKind,
  } from "$lib/api";
  import SideBySideEditor from "$lib/SideBySideEditor.svelte";

  type Page = "attributes" | "skills" | "classes" | "vocab" | "completeness" | "export";

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

  let vocabKind = $state<VocabKind>("proficiency");
  let vocabRows = $state<Vocab[]>([]);
  let selectedVocab = $state<Vocab | null>(null);

  let completeness = $state<CompletenessItem[]>([]);

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
    await loadSkillSpecs();
  }

  async function loadSkillSpecs() {
    selectedSpec = null;
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

  async function go(next: Page) {
    page = next;
    loadError = "";
    try {
      if (next === "attributes") await loadAttributes();
      else if (next === "skills") await loadSkills();
      else if (next === "classes") await loadClasses();
      else if (next === "vocab") await loadVocab();
      else if (next === "completeness") await loadCompleteness();
      else await loadExportPreview();
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    }
  }

  onMount(() => {
    void go("attributes");
  });
</script>

<div class="grid min-h-screen lg:grid-cols-[15rem_1fr]">
  <nav class="border-b border-line bg-raised/90 backdrop-blur lg:border-r lg:border-b-0">
    <div class="px-4 pt-5 pb-3">
      <p class="font-display text-3xl leading-none tracking-tight text-ink">Kedom</p>
      <p class="mt-1 text-xs tracking-[0.18em] text-muted uppercase">Forge</p>
    </div>
    <div class="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col">
      <button type="button" class="forge-nav-btn" data-active={page === "attributes"} onclick={() => go("attributes")}
        >Attributes</button
      >
      <button type="button" class="forge-nav-btn" data-active={page === "skills"} onclick={() => go("skills")}
        >Skills</button
      >
      <button type="button" class="forge-nav-btn" data-active={page === "classes"} onclick={() => go("classes")}
        >Classes</button
      >
      <button type="button" class="forge-nav-btn" data-active={page === "vocab"} onclick={() => go("vocab")}
        >Vocabulary</button
      >
      <button
        type="button"
        class="forge-nav-btn"
        data-active={page === "completeness"}
        onclick={() => go("completeness")}>Completeness</button
      >
      <button type="button" class="forge-nav-btn" data-active={page === "export"} onclick={() => go("export")}
        >Export MD</button
      >
    </div>
  </nav>

  <main class="px-4 py-5 sm:px-6 lg:px-8">
    {#if loadError}
      <p class="forge-panel mb-4 px-4 py-3 text-sm text-danger">
        API error: {loadError}. Is <code class="font-mono">npm run forge:api</code> running on :7777?
      </p>
    {/if}

    {#if page === "attributes"}
      <div class="grid gap-4 xl:grid-cols-[16rem_1fr]">
        <div class="forge-panel max-h-[calc(100vh-3rem)] overflow-auto">
          {#each attributes as a (a.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedAttr?.id === a.id}
              onclick={() => (selectedAttr = a)}
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
          />
        {/if}
      </div>
    {:else if page === "skills"}
      <div class="grid gap-4 xl:grid-cols-[18rem_1fr]">
        <div class="forge-panel max-h-[calc(100vh-3rem)] overflow-auto">
          {#each skills as s (s.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedSkill?.id === s.id && !selectedSpec}
              onclick={async () => {
                selectedSkill = s;
                selectedSpec = null;
                await loadSkillSpecs();
              }}
            >
              <span class="block font-medium">{s.label}</span>
              <span class="mt-0.5 block font-mono text-xs text-muted"
                >{s.slug} · {s.attribute_slug} · {s.specialization_mode}</span
              >
            </button>
            {#if selectedSkill?.id === s.id && skillSpecs.length > 0}
              <div class="ml-3 border-l-2 border-line py-1 pl-2">
                {#each skillSpecs as sp (sp.id)}
                  <button
                    type="button"
                    class="forge-list-btn rounded-md border-0"
                    data-active={selectedSpec?.id === sp.id}
                    onclick={() => (selectedSpec = sp)}
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
            onSaved={loadSkills}
          />
        {/if}
      </div>
    {:else if page === "classes"}
      <div class="grid gap-4 xl:grid-cols-[16rem_1fr]">
        <div class="forge-panel max-h-[calc(100vh-3rem)] overflow-auto">
          {#each classes as c (c.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedClass?.id === c.id}
              onclick={() => (selectedClass = c)}
            >
              <span class="block font-medium">{c.label}</span>
              <span class="mt-0.5 block font-mono text-xs text-muted"
                >{c.slug}{#if c.is_full} · full{/if}{#if c.is_partial} · partial{/if}</span
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
            onSaved={loadClasses}
          />
        {/if}
      </div>
    {:else if page === "vocab"}
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <label class="text-xs tracking-wide text-muted uppercase" for="vocab-kind">Kind</label>
        <select
          id="vocab-kind"
          class="forge-input w-auto py-1.5"
          bind:value={vocabKind}
          onchange={() => {
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
      <div class="grid gap-4 xl:grid-cols-[16rem_1fr]">
        <div class="forge-panel max-h-[calc(100vh-6rem)] overflow-auto">
          {#each vocabRows as v (v.id)}
            <button
              type="button"
              class="forge-list-btn"
              data-active={selectedVocab?.id === v.id}
              onclick={() => (selectedVocab = v)}
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
          />
        {/if}
      </div>
    {:else if page === "export"}
      <div class="forge-panel overflow-hidden">
        <div class="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 class="font-display text-xl">Markdown export</h2>
            <p class="mt-1 text-sm text-muted">
              Barebones rulebook from current Forge content. Comments are omitted.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-xs tracking-wide text-muted uppercase" for="export-locale">Locale</label>
            <select
              id="export-locale"
              class="forge-input w-auto py-1.5"
              bind:value={exportLocale}
              onchange={() => void loadExportPreview()}
            >
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
            <button type="button" class="forge-btn forge-btn-primary" onclick={() => void downloadExport()}
              >Download</button
            >
            <button type="button" class="forge-btn" onclick={() => void loadExportPreview()}>Refresh</button>
          </div>
        </div>
        {#if exportStatus}
          <p class="border-b border-line px-4 py-2 text-sm text-muted">{exportStatus}</p>
        {/if}
        <pre
          class="max-h-[calc(100vh-12rem)] overflow-auto bg-sunken/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink"
          >{exportPreview}</pre
        >
      </div>
    {:else}
      <div class="forge-panel overflow-hidden">
        <div class="border-b border-line px-4 py-3">
          <h2 class="font-display text-xl">Completeness</h2>
          <p class="mt-1 text-sm text-muted">
            Missing Russian fields (empty English descriptions are not required yet).
          </p>
        </div>
        {#if completeness.length === 0}
          <p class="px-4 py-6 text-ok">Nothing missing for the tracked fields.</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead class="bg-sunken/40 text-left text-muted">
                <tr>
                  <th class="px-4 py-2 font-medium">Kind</th>
                  <th class="px-4 py-2 font-medium">Slug</th>
                  <th class="px-4 py-2 font-medium">English</th>
                  <th class="px-4 py-2 font-medium">Missing</th>
                </tr>
              </thead>
              <tbody>
                {#each completeness as row (row.entity_kind + row.entity_id)}
                  <tr class="border-t border-line">
                    <td class="px-4 py-2">{row.entity_kind}</td>
                    <td class="px-4 py-2"><code class="font-mono text-xs">{row.slug}</code></td>
                    <td class="px-4 py-2">{row.label}</td>
                    <td class="px-4 py-2 text-warn">{row.missing.join(", ")}</td>
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
