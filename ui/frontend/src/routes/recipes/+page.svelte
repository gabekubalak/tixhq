<script>
  import { onMount } from "svelte";

  let recipes = [];
  let zones = {};
  let assignments = {};
  let confirmPresent = {};
  let status = {};

  async function refresh() {
    const [r, z] = await Promise.all([
      fetch("/api/recipes").then(r => r.json()),
      fetch("/api/zones").then(r => r.json())
    ]);
    recipes = r;
    zones = z;
  }

  async function assign(crop, shelfId) {
    if (!confirmPresent[shelfId]) {
      status[shelfId] = "You must confirm physical presence";
      return;
    }
    status[shelfId] = "Assigning...";
    try {
      const res = await fetch(`/api/zones/${shelfId}/recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop, physically_present: true })
      });
      const data = await res.json();
      if (data.ok) {
        status[shelfId] = `Assigned ${cropLabel(crop)} to shelf ${shelfId}`;
        await refresh();
      } else {
        status[shelfId] = `Error: ${JSON.stringify(data)}`;
      }
    } catch (e) {
      status[shelfId] = `Error: ${e.message}`;
    }
  }

  function totalDays(recipe) {
    return (recipe.phases || []).reduce((s, p) => s + (p.duration_days || 0), 0);
  }

  function harvestSummary(recipe) {
    const h = recipe.harvest?.ready_when;
    if (!h) return "—";
    const parts = [];
    if (h.days_since_start_min) parts.push(`${h.days_since_start_min}+ days`);
    if (h.vision?.leaf_area_cm2_min) parts.push(`leaf area >= ${h.vision.leaf_area_cm2_min} cm²`);
    if (h.vision?.color_health_min) parts.push(`health >= ${h.vision.color_health_min}`);
    return parts.join(", ");
  }

  function cropLabel(crop) {
    return crop.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  onMount(() => { refresh(); });
</script>

<h1>KrattOS — Recipes</h1>
<nav class="views">
  <a href="/">← Dashboard</a>
  <a href="/safety">Safety</a>
  <a href="/composter">Composter</a>
</nav>

<section class="recipes">
  {#each recipes as recipe}
    <article>
      <h3>{cropLabel(recipe.crop)}</h3>
      <dl>
        <dt>Phases</dt><dd>{recipe.phases?.length ?? 0} ({(recipe.phases || []).map(p => p.name).join(" → ")})</dd>
        <dt>Total phase days</dt><dd>{totalDays(recipe)}</dd>
        <dt>Harvest criteria</dt><dd>{harvestSummary(recipe)}</dd>
      </dl>

      <div class="assign-row">
        <label>
          Assign to shelf:
          <select bind:value={assignments[recipe.crop]}>
            <option value={undefined}>— select —</option>
            {#each [0, 1, 2, 3] as sid}
              <option value={sid}>Shelf {sid}</option>
            {/each}
          </select>
        </label>
        <label class="presence">
          <input type="checkbox" bind:checked={confirmPresent[assignments[recipe.crop]]} />
          I am physically present
        </label>
        <button
          disabled={assignments[recipe.crop] == null}
          on:click={() => assign(recipe.crop, assignments[recipe.crop])}
        >Assign</button>
      </div>
      {#if status[assignments[recipe.crop]]}
        <p class="status-msg">{status[assignments[recipe.crop]]}</p>
      {/if}
    </article>
  {/each}
</section>

<section class="current">
  <h2>Current shelf assignments</h2>
  {#each Object.entries(zones) as [id, z]}
    <p><strong>Shelf {id}:</strong> {z.crop ?? z.phase ?? "unassigned"}</p>
  {/each}
  {#if Object.keys(zones).length === 0}
    <p>No shelf data available.</p>
  {/if}
</section>

<style>
  :global(body) { font-family: system-ui, sans-serif; margin: 2rem; }
  article { border: 1px solid #ddd; padding: 1rem; margin: .5rem 0; }
  dl { display: grid; grid-template-columns: max-content auto; gap: .25rem 1rem; }
  .views { display: flex; gap: 1rem; margin: .5rem 0 1rem; }
  .views a { color: #06c; text-decoration: none; font-weight: 500; }
  .assign-row { display: flex; align-items: center; gap: 1rem; margin-top: .75rem; flex-wrap: wrap; }
  .assign-row select { padding: .25rem; }
  .assign-row button { padding: .35rem .75rem; cursor: pointer; }
  .presence { font-size: .9rem; color: #555; }
  .status-msg { margin: .25rem 0 0; font-size: .9rem; color: #06c; }
  .current { margin-top: 1.5rem; }
</style>
