# KrattOS pitch site

The public marketing and pitch site for KrattOS. A SvelteKit app with the
interactive 3D twin and architecture graph reused from the operator UI.

Pages:
- `/` home, the mission and the three tiers
- `/twin` the interactive 3D digital twin (auto-animated demo)
- `/system` the architecture graph and how the offline system works
- `/build` the three tiers (Nano, Lite, Full) and the cost breakdown
- `/pitch` the mission, the funding ask, and the FAQ

## Run locally

```bash
cd site
npm install
npm run dev      # http://localhost:5174
```

## Build

```bash
npm run build    # uses @sveltejs/adapter-vercel
npm run preview  # serve the production build locally
```

## Deploy to Vercel

This site lives in the `site/` subdirectory of the repo, so set the
project's **Root Directory** to `site` in Vercel.

### Option A: GitHub integration (recommended, no token)

1. In Vercel, "Add New Project" and import this GitHub repo.
2. Set **Root Directory** to `site`.
3. Framework preset auto-detects as SvelteKit. Leave build/install as is.
4. Name the project `krattos`. Deploy.

Every push to the branch then redeploys automatically.

### Option B: Vercel CLI from your machine

```bash
cd site
npm install -g vercel
vercel link --project krattos   # first time, links the dir to the project
vercel --prod                   # deploys
```

If you use a token instead of interactive login:

```bash
vercel --prod --token "$VERCEL_TOKEN"
```

(Do not commit the token. Pass it via an environment variable.)
