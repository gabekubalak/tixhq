<script>
  import { page } from "$app/stores";
  $: pathname = $page.url.pathname;
  const nav = [
    { href: "/",        label: "Home" },
    { href: "/twin",    label: "The 3D twin" },
    { href: "/system",  label: "System" },
    { href: "/build",   label: "Build one" },
    { href: "/pitch",   label: "Back it" }
  ];
</script>

<header>
  <a class="brand" href="/">
    <img src="/krattos-logo.svg" alt="KrattOS" />
  </a>
  <nav>
    {#each nav as item}
      <a href={item.href} class:active={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}>{item.label}</a>
    {/each}
  </nav>
</header>

<main>
  <slot />
</main>

<footer>
  <div class="inner">
    <span>KrattOS &copy; 2026. Software is MIT-licensed. The appliance is closed-source until production.</span>
    <span><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a> · <a href="/pitch">Back the proof on GoFundMe</a></span>
  </div>
</footer>

<style>
  :global(:root) {
    --evergreen: #2E5A41;
    --leaf-front: #6FB07A;
    --leaf-back: #3F7350;
    --brass: #C2992E;
    --ink: #23201B;
    --paper: #F4F1EA;
    --paper-warm: #ECE6D6;
    --paper-warm-2: #DCD3BC;
  }
  :global(html), :global(body) {
    margin: 0; padding: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  :global(a) { color: var(--evergreen); text-decoration: none; }
  :global(a:hover) { text-decoration: underline; }
  :global(h1), :global(h2), :global(h3) { letter-spacing: -0.02em; line-height: 1.1; }
  :global(h1) { font-size: clamp(2.2rem, 5vw, 4rem); font-weight: 700; margin: 0 0 1rem; }
  :global(h2) { font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 600; margin: 0 0 .8rem; }
  :global(h3) { font-size: 1.25rem; font-weight: 600; margin: 0 0 .5rem; }
  :global(.lede) { font-size: clamp(1.05rem, 1.6vw, 1.35rem); color: #4a4a45; line-height: 1.5; max-width: 60ch; }
  :global(.container) { max-width: 1140px; margin: 0 auto; padding: 0 1.5rem; }
  :global(.section) { padding: clamp(3rem, 8vw, 6rem) 0; }
  :global(.btn) {
    display: inline-block;
    padding: .85rem 1.4rem;
    border-radius: 999px;
    font-weight: 600;
    font-size: 1rem;
    background: var(--evergreen);
    color: var(--paper);
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: transform .15s ease, background .15s ease;
  }
  :global(.btn:hover) { background: #234734; transform: translateY(-1px); text-decoration: none; }
  :global(.btn-secondary) { background: transparent; color: var(--evergreen); border: 2px solid var(--evergreen); padding: calc(.85rem - 2px) calc(1.4rem - 2px); }
  :global(.btn-secondary:hover) { background: var(--evergreen); color: var(--paper); }

  header {
    position: sticky; top: 0; z-index: 50;
    background: rgba(244, 241, 234, 0.94);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid #E5DFCD;
    padding: .8rem 1.5rem;
    display: flex; align-items: center; justify-content: space-between;
    gap: 2rem;
  }
  .brand img { height: 32px; display: block; }
  nav { display: flex; gap: 1.6rem; align-items: center; flex-wrap: wrap; }
  nav a {
    color: var(--ink);
    font-size: .95rem;
    font-weight: 500;
    text-decoration: none;
    padding: .25rem 0;
    border-bottom: 2px solid transparent;
  }
  nav a:hover { color: var(--evergreen); text-decoration: none; }
  nav a.active { border-bottom-color: var(--brass); color: var(--evergreen); }

  main { min-height: 70vh; }

  footer {
    background: var(--evergreen);
    color: rgba(244,241,234,0.85);
    padding: 2rem 1.5rem;
    margin-top: 4rem;
  }
  footer .inner {
    max-width: 1140px; margin: 0 auto;
    display: flex; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
    font-size: .9rem;
  }
  footer a { color: #fff; text-decoration: underline; }
</style>
