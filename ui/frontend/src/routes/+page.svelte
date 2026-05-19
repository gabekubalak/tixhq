<script>
  import { onMount } from "svelte";

  let zones = {};
  let composter = {};
  let alerts = [];

  async function refresh() {
    const [z, c, a] = await Promise.all([
      fetch("/api/zones").then(r => r.json()),
      fetch("/api/composter").then(r => r.json()),
      fetch("/api/alerts").then(r => r.json())
    ]);
    zones = z; composter = c; alerts = a;
  }

  onMount(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  });
</script>

<h1>GroveOS</h1>

{#if alerts.length}
  <section class="alerts">
    <h2>Alerts</h2>
    {#each alerts as a}
      <div class="alert {a.severity}">
        <strong>{a.severity}</strong> · {a.message}
      </div>
    {/each}
  </section>
{/if}

<section class="zones">
  <h2>Zones</h2>
  {#each Object.entries(zones) as [id, z]}
    <article>
      <h3>Shelf {id} — {z.phase ?? "—"}</h3>
      <dl>
        <dt>Moisture</dt><dd>{z.moisture_pct?.toFixed?.(1) ?? "—"} %</dd>
        <dt>EC setpoint</dt><dd>{z.ec_ms_cm ?? "—"} mS/cm</dd>
        <dt>pH setpoint</dt><dd>{z.ph ?? "—"}</dd>
        <dt>Vision</dt>
        <dd>{z.vision?.phase_estimate ?? "—"} · health {z.vision?.color_health?.toFixed?.(2) ?? "—"}</dd>
      </dl>
    </article>
  {/each}
</section>

<section class="composter">
  <h2>Composter</h2>
  <p>Phase: <strong>{composter.phase ?? "—"}</strong></p>
  <p>Temp: {composter.temp_c ?? "—"} °C · thermophilic hold: {composter.thermo_hold_seconds ?? 0} s · pathogen kill OK: {composter.pathogen_kill_ok ?? false}</p>
</section>

<style>
  :global(body) { font-family: system-ui, sans-serif; margin: 2rem; }
  .alert { padding: .5rem; border-left: 4px solid currentColor; margin: .25rem 0; }
  .alert.critical { color: #c00; }
  .alert.warning  { color: #c70; }
  .alert.info     { color: #06c; }
  article { border: 1px solid #ddd; padding: 1rem; margin: .5rem 0; }
  dl { display: grid; grid-template-columns: max-content auto; gap: .25rem 1rem; }
</style>
