<script>
  import { onMount } from "svelte";

  let profile = { name: "...", form_factor: "appliance_cabinet", zones: [], has_composter: false };
  let zones = {};
  let composter = {};
  let alerts = [];

  async function refreshProfile() {
    try {
      profile = await fetch("/api/profile").then(r => r.json());
    } catch {
      // Leave the placeholder; UI degrades gracefully
    }
  }

  async function refresh() {
    const tasks = [
      fetch("/api/zones").then(r => r.json()).catch(() => ({})),
      fetch("/api/alerts").then(r => r.json()).catch(() => []),
    ];
    if (profile.has_composter) {
      tasks.push(fetch("/api/composter").then(r => r.json()).catch(() => ({})));
    } else {
      tasks.push(Promise.resolve({}));
    }
    const [z, a, c] = await Promise.all(tasks);
    zones = z; alerts = a; composter = c;
  }

  function labelFor(id) {
    const z = profile.zones?.find?.(z => String(z.id) === String(id));
    return z?.label || `Zone ${id}`;
  }

  function formFactorLabel(ff) {
    return {
      appliance_cabinet: "Indoor cabinet",
      hoop_house:        "Greenhouse (hoop house)",
      greenhouse:        "Greenhouse",
      wire_rack:         "Wire-rack shelf",
      basement:          "Basement",
      outdoor_row:       "Outdoor row",
    }[ff] || ff;
  }

  $: zoneEntries = Object.entries(zones).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  onMount(async () => {
    await refreshProfile();
    await refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  });
</script>

<header class="topbar">
  <div>
    <h1>KrattOS</h1>
    <p class="subtitle">{formFactorLabel(profile.form_factor)} <span class="dot">·</span> profile <code>{profile.name}</code></p>
  </div>
  <nav class="views">
    <a href="/recipes">Recipes</a>
    <a href="/safety">Safety</a>
    {#if profile.has_composter}
      <a href="/composter">Composter</a>
    {/if}
    <a href="/3d">3D twin</a>
    <a href="/3d/arch">Architecture</a>
  </nav>
</header>

{#if alerts.length}
  <section class="alerts">
    <h2>Alerts</h2>
    {#each alerts as a}
      <div class="alert {a.severity}">
        <strong>{a.severity}</strong>
        <span>{a.message}</span>
        {#if a.shelf_id != null}<em>{labelFor(a.shelf_id)}</em>{/if}
      </div>
    {/each}
  </section>
{/if}

<section class="zones">
  <h2>{profile.form_factor === "appliance_cabinet" ? "Shelves" : "Beds"}</h2>
  {#if zoneEntries.length === 0}
    <p class="empty">No live data yet. Once the bus is up, zones appear here.</p>
  {/if}
  <div class="zone-grid">
    {#each zoneEntries as [id, z]}
      <article>
        <h3>{labelFor(id)}</h3>
        <p class="phase">{z.phase ?? "no recipe assigned"}</p>
        <dl>
          <dt>Moisture</dt>
          <dd>{z.moisture_pct?.toFixed?.(1) ?? "—"} %</dd>
          {#if profile.has_auto_dosing}
            <dt>EC setpoint</dt>
            <dd>{z.ec_ms_cm ?? "—"} mS/cm</dd>
            <dt>pH setpoint</dt>
            <dd>{z.ph ?? "—"}</dd>
          {/if}
          {#if z.vision}
            <dt>Vision</dt>
            <dd>{z.vision.phase_estimate ?? "—"} · health {z.vision.color_health?.toFixed?.(2) ?? "—"}</dd>
          {/if}
        </dl>
      </article>
    {/each}
  </div>
</section>

{#if profile.has_composter}
  <section class="composter">
    <h2>Composter</h2>
    <p>Phase: <strong>{composter.phase ?? "—"}</strong></p>
    <p class="muted">
      Temp: {composter.temp_c ?? "—"} °C
      · thermophilic hold: {composter.thermo_hold_seconds ?? 0} s
      · pathogen kill OK: {composter.pathogen_kill_ok ?? false}
    </p>
  </section>
{/if}

<style>
  :global(body) {
    font-family: system-ui, -apple-system, sans-serif;
    margin: 0;
    background: #f4f1ea;
    color: #23201b;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: #fff;
    border-bottom: 1px solid #ddd3bb;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .topbar h1 { margin: 0; font-size: 1.5rem; color: #2e5a41; }
  .subtitle { margin: .2rem 0 0; color: #6c6862; font-size: .9rem; }
  .subtitle code { background: #ece6d6; padding: .1rem .4rem; border-radius: 4px; font-size: .85em; }
  .subtitle .dot { margin: 0 .3rem; color: #aaa; }
  nav.views { display: flex; gap: 1.2rem; }
  nav.views a {
    color: #2e5a41;
    text-decoration: none;
    font-weight: 500;
    font-size: .95rem;
    border-bottom: 2px solid transparent;
    padding-bottom: .2rem;
  }
  nav.views a:hover { border-bottom-color: #c2992e; }

  section { margin: 1.5rem 2rem; }
  section h2 { font-size: 1.1rem; color: #2e5a41; margin: 0 0 .8rem; }

  .alerts .alert {
    padding: .6rem .8rem;
    border-left: 4px solid currentColor;
    margin: .35rem 0;
    background: #fff;
    border-radius: 0 4px 4px 0;
    display: flex;
    gap: .8rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .alert.critical { color: #c00; }
  .alert.warning  { color: #c70; }
  .alert.info     { color: #06c; }
  .alert em { color: #6c6862; font-style: normal; font-size: .85rem; }

  .empty { color: #6c6862; font-style: italic; }
  .zone-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
  }
  article {
    background: #fff;
    border: 1px solid #ddd3bb;
    border-radius: 8px;
    padding: 1rem;
  }
  article h3 { margin: 0 0 .25rem; color: #23201b; font-size: 1rem; }
  article .phase { margin: 0 0 .6rem; color: #6c6862; font-size: .85rem; text-transform: capitalize; }
  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: .25rem 1rem;
    margin: 0;
    font-size: .92rem;
  }
  dt { color: #6c6862; }
  dd { margin: 0; font-variant-numeric: tabular-nums; }

  .composter {
    background: #fff;
    border: 1px solid #ddd3bb;
    border-radius: 8px;
    padding: 1rem 1.2rem;
  }
  .composter p { margin: .25rem 0; }
  .composter .muted { color: #6c6862; font-size: .9rem; }
</style>
