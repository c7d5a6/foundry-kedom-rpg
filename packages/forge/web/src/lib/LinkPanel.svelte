<script lang="ts">
  type Link = { slug: string; label: string; detail?: string };

  type Props = {
    title?: string;
    links: Link[];
    empty?: string;
  };

  let { title = "Linked from", links, empty = "None" }: Props = $props();
</script>

<section class="mt-3 border-t border-line pt-3">
  <h3 class="mb-1.5 font-display text-lg text-ink">{title}</h3>
  {#if links.length === 0}
    <p class="text-sm text-muted">{empty}</p>
  {:else}
    <ul class="flex flex-col gap-0.5">
      {#each links as link (link.slug + (link.detail ?? ""))}
        <li class="text-sm text-ink">
          <span class="font-medium">{link.label}</span>
          <span class="ml-1 font-mono text-xs text-muted">{link.slug}</span>
          {#if link.detail}
            <span class="ml-1 text-xs text-muted">· {link.detail}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
