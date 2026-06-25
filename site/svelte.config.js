import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ runtime: "nodejs20.x" }),
    alias: {
      $lib: "src/lib"
    },
    prerender: {
      // A single crawled internal link returning 404 should not fail the
      // whole production build. Warn loudly instead of throwing, so a
      // missing page degrades to a broken link rather than no deploy at
      // all. Any other prerender error still fails the build.
      handleHttpError: ({ status, path, message }) => {
        if (status === 404) {
          console.warn(`prerender: ${message} (skipping ${path})`);
          return;
        }
        throw new Error(message);
      }
    }
  }
};
