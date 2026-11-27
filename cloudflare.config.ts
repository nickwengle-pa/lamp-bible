import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  accountId: "d78c7bb112c3acb8e8567031af9e9ab8",
  worker: defineWorker({
    name: "lamp-bible",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-26",
    compatibilityFlags: ["nodejs_compat"],
    domains: ["lamp119.app", "www.lamp119.app"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      VESSEL_NOTES: bindings.kv({ id: "32984e81f3184120950bb08043a327c9" }),
    },
  }),
});
