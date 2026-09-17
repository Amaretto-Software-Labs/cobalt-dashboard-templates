import type { Dataset, StoredRecord } from "./index.js";

const prefix = "/__cobalt/dashboard/";
async function call(path: string, body: unknown = {}) {
  const response = await fetch(prefix + path, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Cobalt-Dashboard": "1" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message ?? "Dashboard request failed."), { code: result.code });
  return result;
}

export function installDevelopmentBridge() {
  if (window.cobaltDashboard) return;
  window.cobaltDashboard = {
    getDataset: <T = Dataset>(key: string, params: Record<string, unknown> = {}) => call("dataset", { key, params }) as Promise<T>,
    getRecords: (collection: string) => call("records", { collection }) as Promise<{ items: StoredRecord[] }>,
    async requestAction(key, input) {
      const grant = await call("action-grant", { key, input });
      if (!await confirmAction(key)) throw new Error("Action cancelled.");
      const run = await call("action-run", { key, grantId: grant.grantId, idempotencyKey: crypto.randomUUID() });
      return run.result;
    },
  };
}

// Standalone Agent Browser has no Cobalt parent to display its normal confirmation.
function confirmAction(key: string): Promise<boolean> {
  return new Promise(resolve => {
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", "Confirm dashboard action");
    dialog.style.cssText = "color:var(--color-text,CanvasText);background:var(--color-panel,Canvas);border:1px solid var(--color-border,GrayText);border-radius:var(--radius-sm,4px);padding:24px;max-width:420px";
    const title = document.createElement("h2"); title.textContent = "Confirm dashboard action";
    const description = document.createElement("p"); description.textContent = `Run “${key}” against this dashboard's real records?`;
    const cancel = document.createElement("button"); cancel.textContent = "Cancel"; cancel.className = "cobalt-button";
    const confirm = document.createElement("button"); confirm.textContent = "Confirm"; confirm.className = "cobalt-button";
    let accepted = false;
    cancel.onclick = () => dialog.close();
    confirm.onclick = () => { accepted = true; dialog.close(); };
    dialog.onclose = () => { dialog.remove(); resolve(accepted); };
    dialog.append(title, description, cancel, confirm); document.body.append(dialog); dialog.showModal(); cancel.focus();
  });
}
