// The video renders the web app's real components (../web/src). Remotion bundles them with webpack; this points
// "@/..." at the web app's source, lets its imports resolve from its own node_modules, and swaps the few things that
// only exist inside Next.js or need a signed-in server for small stand-ins (src/mocks). One React for everything.
import path from "node:path";
import { Config } from "@remotion/cli/config";
import { webpack } from "@remotion/bundler";

// Remotion compiles this file elsewhere, so paths start from the folder the npm scripts run in (apps/video).
const root = process.cwd();
const web = path.resolve(root, "../web");
const here = (p: string) => path.resolve(root, p);

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
const appDir = path.join(web, "src", "app", "app");
Config.overrideWebpackConfig((config) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    // The app's own files import their server actions as "./actions": those go to the stand-in too.
    new webpack.NormalModuleReplacementPlugin(/^\.\/actions$/, (r: { context: string; request: string }) => {
      if (r.context === appDir) r.request = here("src/mocks/actions.ts");
    }),
  ],
  resolve: {
    ...config.resolve,
    modules: [here("node_modules"), path.join(web, "node_modules"), "node_modules"],
    alias: {
      ...(config.resolve?.alias ?? {}),
      // Order matters: the exact mocks before the "@" folder alias.
      "@/lib/auth-client": here("src/mocks/auth-client.ts"),
      "@/lib/vault": here("src/mocks/vault.ts"),
      "@/app/app/actions": here("src/mocks/actions.ts"),
      "next/link": here("src/mocks/next-link.tsx"),
      "next/navigation": here("src/mocks/next-navigation.ts"),
      "next/dynamic": here("src/mocks/next-dynamic.tsx"),
      "@": path.join(web, "src"),
      react: here("node_modules/react"),
      "react-dom": here("node_modules/react-dom"),
    },
  },
}));
