<script lang="ts">
  import { onDestroy } from "svelte";
  import { EditorState } from "@codemirror/state";
  import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
  import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
  import { markdown } from "@codemirror/lang-markdown";
  import { markdownImage, markdownLink, renderMarkdown } from "$lib/markdown";

  type Props = {
    label: string;
    value: string;
    placeholder?: string;
    /** Persist this field only — does not touch page-level dirty state. */
    onSave: (markdown: string) => void | Promise<void>;
  };

  let { label, value, placeholder = "", onSave }: Props = $props();

  let editing = $state(false);
  let draft = $state("");
  let status = $state("");
  let error = $state(false);
  let hostEl = $state<HTMLDivElement | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let view: EditorView | null = null;

  const previewHTML = $derived(renderMarkdown(editing ? draft : value));

  function destroyEditor() {
    view?.destroy();
    view = null;
  }

  onDestroy(destroyEditor);

  function startEdit() {
    status = "";
    error = false;
    draft = value;
    editing = true;
    queueMicrotask(() => mountEditor());
  }

  function cancelEdit() {
    destroyEditor();
    editing = false;
    draft = "";
    status = "";
    error = false;
  }

  function mountEditor() {
    destroyEditor();
    if (!hostEl) return;

    const forgeTheme = EditorView.theme(
      {
        "&": {
          color: "var(--forge-text)",
          backgroundColor: "var(--forge-surface-sheet)",
          fontSize: "0.875rem",
        },
        ".cm-content": {
          fontFamily: "var(--kedom-font-mono)",
          caretColor: "var(--forge-text)",
          minHeight: "7rem",
          padding: "0.5rem 0.625rem",
        },
        ".cm-focused": { outline: "none" },
        ".cm-gutters": { display: "none" },
        ".cm-activeLine": { backgroundColor: "transparent" },
        "&.cm-focused .cm-cursor": { borderLeftColor: "var(--forge-text)" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
          backgroundColor: "color-mix(in srgb, var(--forge-accent-fill) 35%, transparent)",
        },
        ".cm-placeholder": { color: "var(--forge-text-muted)", fontStyle: "italic" },
      },
      { dark: true },
    );

    view = new EditorView({
      parent: hostEl,
      state: EditorState.create({
        doc: draft,
        extensions: [
          forgeTheme,
          history(),
          markdown(),
          EditorView.lineWrapping,
          cmPlaceholder(placeholder || "Markdown…"),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              draft = update.state.doc.toString();
            }
          }),
        ],
      }),
    });
    view.focus();
  }

  function selectedOrFallback(fallback: string): string {
    if (!view) return fallback;
    const { from, to } = view.state.selection.main;
    const selected = view.state.doc.sliceString(from, to);
    return selected || fallback;
  }

  function insertAtCursor(text: string) {
    if (!view) return;
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  }

  function setLink() {
    const url = window.prompt("Link URL", "https://");
    if (url === null || url.trim() === "") return;
    insertAtCursor(markdownLink(selectedOrFallback("link"), url.trim()));
  }

  function pickImage() {
    fileInput?.click();
  }

  async function onImagePicked(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      status = "Choose an image file";
      error = true;
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      status = "Image too large (max ~1.5 MiB)";
      error = true;
      return;
    }
    const dataUrl = await readAsDataURL(file);
    const alt = file.name.replace(/\.[^.]+$/, "") || "image";
    insertAtCursor(markdownImage(alt, dataUrl));
  }

  function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsDataURL(file);
    });
  }

  async function saveField() {
    status = "Saving…";
    error = false;
    try {
      const markdown = (view?.state.doc.toString() ?? draft).trim();
      await onSave(markdown);
      destroyEditor();
      editing = false;
      draft = "";
      status = "Saved";
    } catch (e) {
      error = true;
      status = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<div class="forge-field">
  <div class="flex items-center justify-between gap-2">
    <span class="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
    {#if status}
      <span class="text-xs {error ? 'text-danger' : 'text-ok'}">{status}</span>
    {/if}
  </div>

  {#if editing}
    <div class="forge-rich-edit">
      <div class="forge-rich-toolbar" role="toolbar" aria-label="Markdown tools">
        <button type="button" class="forge-btn" onclick={setLink} title="Insert link">Link</button>
        <button type="button" class="forge-btn" onclick={pickImage} title="Insert image"
          >Image</button
        >
        <input
          bind:this={fileInput}
          type="file"
          accept="image/*"
          class="hidden"
          onchange={(e) => void onImagePicked(e)}
        />
        <span class="ml-auto flex gap-1">
          <button type="button" class="forge-btn" onclick={cancelEdit}>Cancel</button>
          <button type="button" class="forge-btn forge-btn-primary" onclick={() => void saveField()}
            >Save</button
          >
        </span>
      </div>
      <div class="grid grid-cols-2 gap-0 divide-x divide-[color:var(--forge-border)]">
        <div bind:this={hostEl} class="forge-md-editor min-h-28"></div>
        <div class="forge-prose max-h-64 overflow-auto px-2.5 py-2">
          {#if previewHTML}
            {@html previewHTML}
          {:else}
            <p class="text-muted italic">{placeholder || "(empty)"}</p>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="forge-rich-view group">
      <button
        type="button"
        class="forge-btn forge-rich-edit-btn"
        onclick={startEdit}
        title="Edit description">Edit</button
      >
      {#if previewHTML}
        <div class="forge-prose">{@html previewHTML}</div>
      {:else}
        <p class="text-sm text-muted italic">{placeholder || "(empty)"}</p>
      {/if}
    </div>
  {/if}
</div>
