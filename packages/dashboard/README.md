# @cobalt-code/dashboard

Cobalt dashboard SDK: React hooks, the published viewer bridge, and live task development using the same dataset runtime.

## Install

```sh
npm install --save-exact @cobalt-code/dashboard@0.2.0
```

React is a peer dependency; the development plugin also requires Vite 8. Commit the lockfile. The saved dashboard build bundles the browser SDK and does not load npm packages at runtime.

## Read data

```tsx
import { useDataset } from "@cobalt-code/dashboard";

export function Metrics() {
  const { data, loading, error, refresh } = useDataset<{ requests: number }>(
    "metrics", { service: "checkout" },
  );
  if (error) return <p role="alert">{error}</p>;
  if (loading || !data) return <p>Loading…</p>;
  return <button onClick={() => void refresh()}>{data.requests} requests</button>;
}
```

`useDataset<T>(key, parameters)` exposes loading, error and refresh state. `useLiveDataset<T>(key, parameters, { intervalMs, enabled })` polls without overlap, backs off on errors and stops when unmounted. `StreamDataset<T>` describes the bounded incremental event window. File changes during development invalidate hooks and discard stale responses.

For imperative calls, use `datasets.run<T>(key, parameters)` or `bridge().getDataset<T>(key, parameters)`. The bridge also exposes `getRecords(collection)` and `requestAction(key, input)`. Actions require confirmation and operate on real dashboard records in both environments. Connected provider sources currently support reads only. `safeUrl(value)` accepts HTTP/HTTPS links.

## Develop in a Cobalt task

Call `dashboard_workspace checkout` in the dashboard's private coding task. It restores the saved project and writes `.cobalt/connection.json`. This one-day credential is read only by the Node development server/CLI. Never print, commit or bundle it. Repeat checkout to renew an expired credential without overwriting edits.

Add the plugin to the project's existing Vite configuration:

```ts
import { cobaltDashboard } from "@cobalt-code/dashboard/vite";
// Keep the project's React and build plugins/configuration.
export default { plugins: [cobaltDashboard()] };
```

Use the normal task preview and Agent Browser with `npm run dev`. The plugin injects a development bridge, proxies data calls from Node to Cobalt, and watches dataset files. Production uses Cobalt's iframe bridge automatically; React code is identical and does not select an environment or dataset revision.

Declare datasets in `datasets.json`, including their runtime, parameter/output schemas, refresh policy, source aliases, and `scriptFile: "datasets/metrics.js"`. Author JavaScript scripts as `async function main(input, ctx)`; optional JSDoc types are exported by `@cobalt-code/dashboard/datasets`. Scripts execute in Cobalt, not the browser or Vite process. Store discovered, authorized source bindings in `source-bindings.json` as an array. The plugin synchronizes the manifest, definitions, scripts and bindings before data requests. Invalid files or failed synchronization block requests; the SDK never silently falls back to published data or fixtures.

```sh
npx cobalt-dashboard dataset run metrics --params '{"service":"checkout"}'
```

This CLI synchronizes the current files, runs the real dataset through Cobalt and prints JSON; errors exit nonzero. Source policies and workspace permissions remain enforced. Computer-runtime datasets execute through the same Cobalt executor using the editing task computer; include their entrypoint/lockfile/support files under `datasets/`.

After building, `vite preview` with the same plugin serves the saved compiled dashboard and runs its current datasets. It requires the curated build manifest (`dist/build.json`); changed source or artifacts produce a rebuild error. This proves the saved assets match the tested source. Both development modes use the existing task preview infrastructure. The development credential and transport are excluded from production bundles.

Run `npm run package`, then import using `dashboard_workspace` with the original checkout version. The host reads source bindings from the packaged file. Activation remains a separate operation. Published dashboards use immutable saved assets and dataset scripts and do not depend on the editing computer.

## Package checks and release

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm pack
npm publish cobalt-code-dashboard-0.2.0.tgz --access public
```

Test the packed artifact before publishing. Pin a new version for changes; saved dashboards retain their installed SDK and bundle. Do not include credentials, fixtures or task context in this package.
