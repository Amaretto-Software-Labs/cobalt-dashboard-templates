import { useMemo, useState } from "react";
import type { Item } from "@cobalt-code/dashboard";
import { Plus } from "lucide-react";
import { Dashboard, FilterBar, State } from "../Layout";
import { Button, Notice, Select } from "../Controls";
import { applyBoardMove } from "../Board";
import { DashboardComposition } from "../compositions/DashboardComposition";
import { RecordEditor } from "../compositions/RecordEditor";
import { dashboards, type DashboardKind } from "../compositions/catalog";
import type { DashboardData } from "../compositions/types";
import { fixture } from "./fixtures";
export function SampleDashboard({ kind }: { kind: DashboardKind }) {
  const info = dashboards.find((d) => d.id === kind)!;
  const [items, setItems] = useState(() => fixture(kind).items || []),
    [query, setQuery] = useState(""),
    [range, setRange] = useState("24h"),
    [state, setState] = useState("healthy"),
    [editing, setEditing] = useState<Item>();
  const base = useMemo(() => fixture(kind, range), [kind, range]);
  const editable = base.mode === "records";
  const metrics = editable
    ? [
        ...["To do", "In progress", "Done"].map((label) => ({
          label,
          value: items.filter((i) => i.status === label).length,
        })),
        {
          label: "Completion",
          value: items.length
            ? Math.round(
                (items.filter((i) => i.status === "Done").length /
                  items.length) *
                  100,
              )
            : 0,
          unit: "%",
        },
      ]
    : base.metrics;
  let data: DashboardData = { ...base, items, metrics };
  if (state === "empty") data = { configured: true, items: [], sources: [] };
  if (state === "partial")
    data = { ...data, complete: false, gap: "A source page was unavailable." };
  if (state === "stale")
    data = {
      ...data,
      sources: base.sources?.map((s) => ({ ...s, status: "stale" })),
    };
  return (
    <Dashboard
      title={info.title}
      description={info.description}
      actions={
        <>
          <Select
            label="Preview data state"
            value={state}
            onChange={setState}
            options={[
              "healthy",
              "loading",
              "empty",
              "error",
              "stale",
              "partial",
            ].map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            }))}
          />
          {editable && (
            <Button
              primary
              icon={<Plus size={15} />}
              onClick={() => setEditing({ id: "", title: "", status: "To do" })}
            >
              New card
            </Button>
          )}
        </>
      }
    >
      <Notice tone="accent">
        Interactive React sample · These are the same components used by
        generated dashboards. Data is illustrative.
      </Notice>
      <FilterBar
        query={query}
        onQuery={setQuery}
        range={range}
        onRange={setRange}
      />
      {state === "loading" || state === "error" ? (
        <State
          loading={state === "loading"}
          error={
            state === "error"
              ? "The sample source could not be reached."
              : undefined
          }
          retry={() => setState("healthy")}
        />
      ) : (
        <DashboardComposition
          kind={kind}
          data={data}
          query={query}
          onMove={
            editable
              ? async (change) =>
                  setItems((current) => applyBoardMove(current, change))
              : undefined
          }
          onEdit={setEditing}
          onRetry={() => setState("healthy")}
        />
      )}
      <RecordEditor
        record={editing}
        onClose={() => setEditing(undefined)}
        lanes={base.columns || []}
        onSave={
          editable
            ? async (record) =>
                setItems((current) =>
                  record.id
                    ? current.map((i) => (i.id === record.id ? record : i))
                    : [...current, { ...record, id: crypto.randomUUID() }],
                )
            : undefined
        }
        onDelete={
          editable
            ? async (record) =>
                setItems((current) => current.filter((i) => i.id !== record.id))
            : undefined
        }
      />
    </Dashboard>
  );
}
