<script>
  import { onMount } from "svelte";

  let composter = {};

  const PHASES = [
    "idle", "grinding", "mesophilic", "thermophilic", "cure", "tank_ready", "dispensing"
  ];

  async function refresh() {
    composter = await fetch("/api/composter").then(r => r.json());
  }

  function tempColor(temp) {
    if (temp == null) return "#999";
    if (temp >= 55) return "#c00";
    if (temp >= 35) return "#c70";
    return "#999";
  }

  function tempLabel(temp) {
    if (temp == null) return "—";
    if (temp >= 55) return "thermophilic";
    if (temp >= 35) return "mesophilic";
    return "cold";
  }

  function killHours(seconds) {
    if (seconds == null) return 0;
    return (seconds / 3600).toFixed(1);
  }

  function killPct(seconds) {
    if (seconds == null) return 0;
    const hrs = seconds / 3600;
    return Math.min(100, (hrs / 72) * 100);
  }

  onMount(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  });
</script>

<h1>KrattOS — Composter</h1>
<nav class="views">
  <a href="/">← Dashboard</a>
  <a href="/recipes">Recipes</a>
  <a href="/safety">Safety</a>
</nav>

<section class="phase-machine">
  <h2>Phase state machine</h2>
  <div class="phases">
    {#each PHASES as phase}
      <div class="phase-node" class:active={composter.phase === phase}>
        {phase}
      </div>
      {#if phase !== "dispensing"}
        <span class="arrow">→</span>
      {/if}
    {/each}
  </div>
  <p>Current phase: <strong>{composter.phase ?? "—"}</strong></p>
</section>

<section class="temp-section">
  <h2>Temperature</h2>
  <div class="temp-gauge">
    <span class="temp-value" style="color: {tempColor(composter.temp_c)}">
      {composter.temp_c?.toFixed?.(1) ?? "—"} °C
    </span>
    <span class="temp-range" style="color: {tempColor(composter.temp_c)}">
      ({tempLabel(composter.temp_c)})
    </span>
  </div>
</section>

<section class="kill-section">
  <h2>Pathogen kill progress</h2>
  <p>Hours at 55 °C+: <strong>{killHours(composter.thermo_hold_seconds)}</strong> / 72 h required</p>
  <div class="progress-bar">
    <div class="progress-fill" style="width: {killPct(composter.thermo_hold_seconds)}%; background: {composter.pathogen_kill_ok ? '#090' : '#c70'}"></div>
  </div>
  <p>
    Pathogen kill:
    <strong class={composter.pathogen_kill_ok ? "ok" : "pending"}>
      {composter.pathogen_kill_ok ? "COMPLETE" : "pending"}
    </strong>
  </p>
</section>

<section class="tank-section">
  <h2>Slurry tank</h2>
  {#if composter.slurry_level_pct != null}
    <div class="tank">
      <div class="tank-fill" style="height: {composter.slurry_level_pct}%"></div>
      <span class="tank-label">{composter.slurry_level_pct.toFixed(0)}%</span>
    </div>
  {:else}
    <p>Tank level: <strong>—</strong></p>
  {/if}
</section>

{#if composter.batch_id}
  <section class="batch">
    <h2>Batch info</h2>
    <dl>
      <dt>Batch ID</dt><dd>{composter.batch_id}</dd>
      {#if composter.batch_start}
        <dt>Started</dt><dd>{composter.batch_start}</dd>
      {/if}
    </dl>
  </section>
{/if}

<style>
  :global(body) { font-family: system-ui, sans-serif; margin: 2rem; }
  .views { display: flex; gap: 1rem; margin: .5rem 0 1rem; }
  .views a { color: #06c; text-decoration: none; font-weight: 500; }
  section { border: 1px solid #ddd; padding: 1rem; margin: .5rem 0; }
  dl { display: grid; grid-template-columns: max-content auto; gap: .25rem 1rem; }

  .phases { display: flex; align-items: center; gap: .25rem; flex-wrap: wrap; margin-bottom: .75rem; }
  .phase-node {
    padding: .35rem .65rem;
    border: 2px solid #ccc;
    border-radius: 4px;
    font-size: .85rem;
    background: #fafafa;
    color: #666;
  }
  .phase-node.active {
    border-color: #06c;
    background: #e8f0fe;
    color: #06c;
    font-weight: bold;
  }
  .arrow { color: #999; font-size: .85rem; }

  .temp-gauge { font-size: 1.5rem; }
  .temp-value { font-weight: bold; }
  .temp-range { font-size: 1rem; margin-left: .5rem; }

  .progress-bar {
    width: 100%;
    height: 1.25rem;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
    margin: .5rem 0;
  }
  .progress-fill {
    height: 100%;
    transition: width .3s;
    border-radius: 4px;
  }
  .ok { color: #090; }
  .pending { color: #c70; }

  .tank {
    position: relative;
    width: 80px;
    height: 160px;
    border: 2px solid #999;
    border-radius: 4px;
    background: #fafafa;
    overflow: hidden;
  }
  .tank-fill {
    position: absolute;
    bottom: 0;
    width: 100%;
    background: #4a9;
    transition: height .3s;
  }
  .tank-label {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-weight: bold;
    font-size: .9rem;
    z-index: 1;
  }
</style>
