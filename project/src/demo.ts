import type { Item, StoredRecord } from "@cobalt-code/dashboard";
import { fixture } from "../ui/library/fixtures";
import { dashboards, type DashboardKind } from "../ui/compositions/catalog";
let records: StoredRecord[] = fixture("work").items!.map((item, i) => ({
  recordId: item.id,
  version: 1,
  values: { ...item, position: i * 1024 },
}));
window.cobaltDashboardDemo = true;
window.cobaltDashboard = {
  async getDataset<T>(_key: string, params?: Record<string, unknown>) {
    const kind = dashboards.some((d) => d.id === params?.template)
      ? (params?.template as DashboardKind)
      : "work";
    return fixture(kind, String(params?.range || "24h")) as T;
  },
  async getRecords() {
    return { items: structuredClone(records) };
  },
  async requestAction(key, input) {
    const id = String(input.recordId),
      previous = records.find((r) => r.recordId === id);
    if ((previous?.version ?? 0) !== input.expectedVersion)
      throw new Error("Card changed. Refresh before retrying.");
    if (key === "delete-card")
      records = records.filter((r) => r.recordId !== id);
    else if (key === "save-card") {
      const next = {
        recordId: id,
        version: (previous?.version || 0) + 1,
        values: input.values as Item,
      };
      records = [...records.filter((r) => r.recordId !== id), next];
    } else throw new Error("Unknown sample action");
    return { success: true };
  },
};
