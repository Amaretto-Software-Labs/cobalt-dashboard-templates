import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  bridge,
  useDataset,
  type Item,
  type StoredRecord,
} from "@cobalt-code/dashboard";
import { Dashboard, FilterBar, State } from "../Layout";
import { Button, Notice } from "../Controls";
import { applyBoardMove, type BoardMove } from "../Board";
import { DashboardComposition } from "./DashboardComposition";
import { RecordEditor } from "./RecordEditor";
import { dashboards, type DashboardKind } from "./catalog";
import type { DashboardData } from "./types";
export default function TemplateDashboard({
  kind,
  title,
  description,
}: {
  kind: DashboardKind;
  title?: string;
  description?: string;
}) {
  const definition = dashboards.find((d) => d.id === kind)!;
  const [query, setQuery] = useState(""),
    [range, setRange] = useState("24h"),
    [source, setSource] = useState("all"),
    [records, setRecords] = useState<StoredRecord[]>([]),
    [editing, setEditing] = useState<Item>(),
    [recordError, setRecordError] = useState("");
  const params = { query, range, source, template: kind };
  const { data, loading, error, refresh } = useDataset<DashboardData>(
    "main",
    params,
  );
  const local = data?.configured && data.mode === "records";
  const loadRecords = useCallback(async () => {
    const result = await bridge().getRecords("cards");
    setRecords(result.items);
    setRecordError("");
  }, []);
  useEffect(() => {
    if (local) void loadRecords().catch((e) => setRecordError(String(e)));
  }, [local, loadRecords]);
  const items = local
    ? records
        .map((r): Item => ({ ...r.values, id: r.recordId }))
        .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    : data?.items || [];
  const lanes = [
    ...new Set([
      ...(data?.columns || ["To do", "In progress", "Done"]),
      ...items.map((i) => i.status),
    ]),
  ];
  async function save(record: Item, remove = false) {
    const previous = records.find((r) => r.recordId === record.id);
    await bridge().requestAction(remove ? "delete-card" : "save-card", {
      recordId: previous?.recordId || crypto.randomUUID(),
      expectedVersion: previous?.version || 0,
      values: {
        ...record,
        position:
          record.position ??
          Math.max(0, ...items.map((i) => Number(i.position || 0))) + 1024,
      },
    });
    await loadRecords();
  }
  async function moveCard(change: BoardMove) {
    const ordered = applyBoardMove(items, change);
    const index = ordered.findIndex((i) => i.id === change.id),
      card = ordered[index],
      same = ordered.filter((i) => i.status === change.status),
      localIndex = same.findIndex((i) => i.id === change.id),
      before = same[localIndex - 1],
      after = same[localIndex + 1];
    const lo = Number(before?.position ?? 0),
      hi = Number(after?.position ?? lo + 2);
    await save({
      ...card,
      position:
        before && after ? (lo + hi) / 2 : before ? lo + 1 : after ? hi - 1 : 0,
    });
  }
  return (
    <Dashboard
      title={title || definition.title}
      description={description || definition.description}
      actions={
        <>
          {local && (
            <Button
              primary
              icon={<Plus size={15} />}
              onClick={() =>
                setEditing({
                  id: "",
                  title: "",
                  status: lanes[0],
                  priority: "Medium",
                })
              }
            >
              New card
            </Button>
          )}
        </>
      }
    >
      <State
        loading={loading && !data}
        error={!data ? error : undefined}
        configured={data?.configured}
        retry={refresh}
      />
      {data && error && (
        <Notice tone="warning">{error} · Showing last successful data.</Notice>
      )}
      {recordError && <Notice tone="danger">{recordError}</Notice>}
      {data?.configured && (
        <>
          <FilterBar
            query={query}
            onQuery={setQuery}
            range={range}
            onRange={setRange}
            source={source}
            onSource={setSource}
            sources={data.sources?.map((s) => s.name)}
          />
          <DashboardComposition
            kind={kind}
            data={{ ...data, items }}
            query={query}
            params={params}
            onMove={local ? moveCard : undefined}
            onEdit={local ? setEditing : undefined}
            onRetry={refresh}
          />
        </>
      )}
      <RecordEditor
        record={editing}
        onClose={() => setEditing(undefined)}
        lanes={lanes}
        onSave={local ? save : undefined}
        onDelete={local ? (record) => save(record, true) : undefined}
      />
    </Dashboard>
  );
}
