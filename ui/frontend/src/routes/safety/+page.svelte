<script>
  import { onMount } from "svelte";

  let safetyTrip = null;
  let loading = true;
  let physicallyPresent = false;
  let resetStatus = "";

  async function refresh() {
    try {
      const data = await fetch("/api/safety").then(r => r.json());
      safetyTrip = data.safety_trip ?? null;
    } catch {
      // backend unavailable — leave safetyTrip as-is
    }
    loading = false;
  }

  async function resetSafety() {
    if (!physicallyPresent) {
      resetStatus = "You must confirm physical presence first.";
      return;
    }
    resetStatus = "Resetting...";
    try {
      const res = await fetch("/api/safety/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ physically_present: true })
      });
      const data = await res.json();
      if (data.ok) {
        resetStatus = "Safety system reset successfully.";
        safetyTrip = null;
      } else {
        resetStatus = `Error: ${JSON.stringify(data)}`;
      }
    } catch (e) {
      resetStatus = `Error: ${e.message}`;
    }
  }

  onMount(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  });
</script>

<h1>GroveOS — Safety</h1>
<nav class="views">
  <a href="/">← Dashboard</a>
  <a href="/recipes">Recipes</a>
  <a href="/composter">Composter</a>
</nav>

{#if loading}
  <p>Loading safety state...</p>
{:else}
  <section class="state">
    <h2>Safety state:
      <span class={safetyTrip ? "tripped" : "armed"}>
        {safetyTrip ? "TRIPPED" : "ARMED"}
      </span>
    </h2>

    {#if safetyTrip}
      <div class="trip-detail">
        <dl>
          <dt>Cause</dt><dd>{safetyTrip.cause ?? "Unknown"}</dd>
          <dt>Timestamp</dt><dd>{safetyTrip.ts ?? "—"}</dd>
          {#if safetyTrip.detail}
            <dt>Detail</dt><dd>{safetyTrip.detail}</dd>
          {/if}
        </dl>
        <div class="instructions">
          <h3>To resolve:</h3>
          <ol>
            <li>Physically go to the appliance and verify the condition is safe.</li>
            <li>Check the toggle below to confirm your physical presence.</li>
            <li>Press Reset to clear the safety latch.</li>
          </ol>
        </div>
        <div class="reset-controls">
          <label class="presence">
            <input type="checkbox" bind:checked={physicallyPresent} />
            I am physically present at the appliance
          </label>
          <button on:click={resetSafety} disabled={!physicallyPresent}>Reset safety trip</button>
        </div>
        {#if resetStatus}
          <p class="status-msg">{resetStatus}</p>
        {/if}
      </div>
    {:else}
      <p class="all-clear">All systems nominal. No active safety trip.</p>
    {/if}
  </section>
{/if}

<section class="architecture">
  <h2>Safety architecture</h2>
  <dl>
    <dt>Dual-MCU design</dt>
    <dd>Primary MCU runs control loops; independent safety MCU monitors invariants and can cut power autonomously.</dd>
    <dt>Hardware watchdog</dt>
    <dd>If the primary MCU fails to pet the watchdog within the deadline, the safety MCU trips the contactor.</dd>
    <dt>Contactor gating</dt>
    <dd>A normally-open contactor gates all actuator power. On any safety trip, the contactor opens and all actuators de-energize to a safe state.</dd>
    <dt>Latching trips</dt>
    <dd>Safety trips are latched — they require a deliberate reset with physical presence confirmation. The system will not auto-recover.</dd>
  </dl>
</section>

<style>
  :global(body) { font-family: system-ui, sans-serif; margin: 2rem; }
  .views { display: flex; gap: 1rem; margin: .5rem 0 1rem; }
  .views a { color: #06c; text-decoration: none; font-weight: 500; }
  .armed { color: #090; font-weight: bold; }
  .tripped { color: #c00; font-weight: bold; }
  .trip-detail { border: 2px solid #c00; padding: 1rem; margin: .5rem 0; background: #fff5f5; }
  dl { display: grid; grid-template-columns: max-content auto; gap: .25rem 1rem; }
  .instructions { margin: 1rem 0; }
  .instructions ol { padding-left: 1.25rem; }
  .reset-controls { display: flex; align-items: center; gap: 1rem; margin-top: .5rem; flex-wrap: wrap; }
  .reset-controls button { padding: .4rem .8rem; background: #c00; color: #fff; border: none; cursor: pointer; }
  .reset-controls button:disabled { background: #999; cursor: not-allowed; }
  .presence { font-size: .9rem; color: #555; }
  .status-msg { margin: .5rem 0 0; font-size: .9rem; color: #06c; }
  .all-clear { color: #090; font-weight: 500; }
  .architecture { margin-top: 2rem; border: 1px solid #ddd; padding: 1rem; }
  .architecture dd { margin-bottom: .5rem; }
  section { margin: .5rem 0; }
</style>
