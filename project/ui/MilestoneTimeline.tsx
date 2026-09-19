import { useEffect, useRef, useState } from "react";
import { DragDropProvider, useDraggable } from "@dnd-kit/react";
import { Feedback, PointerSensor } from "@dnd-kit/dom";
import { Panel, Badge } from "./Layout";
import { Button, Select, Tooltip, Field, Checkbox, Notice } from "./Controls";

export type Milestone = {
  id: string;
  title: string;
  start: string;
  end: string;
  owner?: string;
  blocked?: boolean;
  dependencies?: string[];
};
export function MilestoneTimeline({
  items,
  onSelect,
  onChange,
}: {
  items: Milestone[];
  onSelect?: (id: string) => void;
  onChange?: (item: Milestone) => Promise<void>;
}) {
  const [preview, setPreview] = useState<Milestone>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [undo, setUndo] = useState<Milestone>();
  const drag = useRef<
    { item: Milestone; mode: DragMode; width: number; span: number } | undefined
  >(undefined);
  async function save(item: Milestone, undoing = false) {
    if (!onChange || busy) return false;
    const previous = items.find((i) => i.id === item.id);
    setBusy(true);
    setError("");
    try {
      await onChange(item);
      setUndo(undoing ? undefined : previous);
      setMessage(`${item.title} ${undoing ? "restored" : "saved"}.`);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const [zoom, setZoom] = useState("fit");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string>();
  const valid = items.filter(
    (i) =>
      Number.isFinite(Date.parse(i.start)) &&
      Number.isFinite(Date.parse(i.end)) &&
      Date.parse(i.end) >= Date.parse(i.start),
  );
  const start = Math.min(...valid.map((i) => Date.parse(i.start)));
  const end = Math.max(...valid.map((i) => Date.parse(i.end)));
  const span = Math.max(86400000, end - start);
  const selected =
    preview?.id === selectedId
      ? preview
      : valid.find((i) => i.id === selectedId);
  const dependencies = items.filter((i) =>
    selected?.dependencies?.includes(i.id),
  );
  const dependents = items.filter((i) =>
    i.dependencies?.includes(selectedId || ""),
  );
  const visible = valid.filter((i) => filter === "all" || i.blocked);
  const date = (value: string | number) =>
    new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  const select = (id: string) => {
    setSelectedId(id);
    setFilter("all");
  };
  return (
    <DragDropProvider
      onDragStart={({ operation }) => {
        const source = operation.source;
        const item = items.find((i) => i.id === source?.data.milestoneId);
        const track = source?.element?.closest(".milestone-track");
        if (!item || !track || !onChange || busy) return;
        drag.current = {
          item,
          mode: source!.data.mode as DragMode,
          width: track.getBoundingClientRect().width,
          span,
        };
        setSelectedId(item.id);
        setPreview(item);
        setError("");
      }}
      onDragMove={({ operation, to, by }) => {
        const current = drag.current;
        if (current)
          setPreview(
            shiftMilestone(
              current.item,
              current.mode,
              Math.round(
                ((((to?.x ?? operation.position.current.x + (by?.x ?? 0)) -
                  operation.position.initial.x) /
                  current.width) *
                  current.span) /
                  DAY,
              ),
            ),
          );
      }}
      onDragEnd={(event) => {
        const current = drag.current;
        drag.current = undefined;
        setPreview(undefined);
        if (!current || event.canceled) return;
        const next = shiftMilestone(
          current.item,
          current.mode,
          Math.round(
            (((event.operation.position.current.x -
              event.operation.position.initial.x) /
              current.width) *
              current.span) /
              DAY,
          ),
        );
        if (next.start !== current.item.start || next.end !== current.item.end)
          void save(next);
      }}
    >
      <Panel
        title="Milestones & dependencies"
        actions={
          <div className="toolbar">
            {onChange && (
              <Button
                disabled={!undo || busy}
                onClick={() => undo && void save(undo, true)}
              >
                Undo schedule change
              </Button>
            )}
            <Select
              label="Milestone filter"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `All milestones (${valid.length})` },
                {
                  value: "blocked",
                  label: `Blocked (${valid.filter((i) => i.blocked).length})`,
                },
              ]}
            />
            <Select
              label="Timeline zoom"
              value={zoom}
              onChange={setZoom}
              options={[
                { value: "fit", label: "Fit schedule" },
                { value: "detail", label: "Detailed" },
              ]}
            />
          </div>
        }
      >
        {error && (
          <Notice tone="danger">
            {error} · The saved schedule is unchanged.
          </Notice>
        )}
        {onChange && (
          <p className="muted timeline-hint">
            Drag a bar to move it; drag either edge to resize. Arrow keys adjust
            focused bars or edges by one day. Select a milestone to edit its
            details.
          </p>
        )}
        <p className="sr-only" role="status">
          {busy ? "Saving milestone…" : message}
        </p>
        {preview && (
          <Notice tone="accent">
            {preview.title}: {date(preview.start)} – {date(preview.end)} ·
            Release to save, Escape to cancel
          </Notice>
        )}
        <div className="timeline-scroll">
          <div style={{ minWidth: zoom === "detail" ? 1000 : 600 }}>
            {!!valid.length && (
              <div
                className="milestone-row timeline-axis"
                aria-label="Timeline dates"
              >
                <span />
                <div>
                  {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                    <span key={fraction}>{date(start + span * fraction)}</span>
                  ))}
                </div>
              </div>
            )}
            {visible.map((savedItem) => {
              const item = preview?.id === savedItem.id ? preview : savedItem;
              const related =
                dependencies.some((i) => i.id === item.id) ||
                dependents.some((i) => i.id === item.id);
              const left = Math.min(
                98,
                ((Date.parse(item.start) - start) / span) * 100,
              );
              return (
                <div
                  className={`milestone-row ${selectedId === item.id ? "milestone-selected" : related ? "milestone-related" : ""}`}
                  key={item.id}
                >
                  <Button
                    variant="quiet"
                    aria-pressed={selectedId === item.id}
                    onClick={() => select(item.id)}
                  >
                    {item.title}
                  </Button>
                  <div className="milestone-track">
                    <MilestoneRange
                      item={item}
                      left={left}
                      width={Math.min(
                        100 - left,
                        Math.max(
                          2,
                          ((Date.parse(item.end) - Date.parse(item.start)) /
                            span) *
                            100,
                        ),
                      )}
                      selected={selectedId === item.id}
                      editable={!!onChange && !busy}
                      onSelect={() => select(item.id)}
                      onAdjust={(mode, days) =>
                        void save(shiftMilestone(item, mode, days))
                      }
                    />
                  </div>
                  <Badge tone={item.blocked ? "warning" : "neutral"}>
                    {item.blocked
                      ? "Blocked"
                      : item.dependencies?.length
                        ? `${item.dependencies.length} ${item.dependencies.length === 1 ? "dependency" : "dependencies"}`
                        : "Ready"}
                  </Badge>
                </div>
              );
            })}
            {!visible.length && (
              <p className="empty-state">
                {valid.length
                  ? "No blocked milestones."
                  : "No scheduled milestones."}
              </p>
            )}
          </div>
        </div>
        {selected ? (
          <section
            className="milestone-inspector"
            aria-label="Selected milestone"
          >
            <div className="panel-heading">
              <h3>{selected.title}</h3>
              <Button variant="quiet" onClick={() => setSelectedId(undefined)}>
                Clear selection
              </Button>
            </div>
            <p className="muted">
              {date(selected.start)} – {date(selected.end)} ·{" "}
              {Math.max(
                1,
                Math.ceil(
                  (Date.parse(selected.end) - Date.parse(selected.start)) /
                    86400000,
                ),
              )}{" "}
              days · {selected.owner || "Unassigned"}
            </p>
            {selected.blocked && (
              <Notice tone="warning">This milestone is blocked.</Notice>
            )}
            <div className="dependency-links">
              <span>Depends on</span>
              {selected.dependencies?.length ? (
                selected.dependencies.map((id) => {
                  const item = items.find((i) => i.id === id);
                  return item ? (
                    <Button key={id} variant="quiet" onClick={() => select(id)}>
                      {item.title}
                    </Button>
                  ) : (
                    <span key={id} className="muted">
                      {id} · Unavailable
                    </span>
                  );
                })
              ) : (
                <span className="muted">No dependencies</span>
              )}
            </div>
            <div className="dependency-links">
              <span>Unblocks</span>
              {dependents.length ? (
                dependents.map((item) => (
                  <Button
                    key={item.id}
                    variant="quiet"
                    onClick={() => select(item.id)}
                  >
                    {item.title}
                  </Button>
                ))
              ) : (
                <span className="muted">No downstream milestones</span>
              )}
            </div>
            {onChange && (
              <MilestoneEditor
                key={selected.id}
                item={selected}
                items={items}
                busy={busy || !!preview}
                onSave={save}
              />
            )}
            {onSelect && (
              <Button onClick={() => onSelect(selected.id)}>
                Open milestone details
              </Button>
            )}
          </section>
        ) : (
          !!valid.length && (
            <p className="muted timeline-hint">
              Select a milestone to explore its dates, dependencies and
              downstream work.
            </p>
          )
        )}
      </Panel>
    </DragDropProvider>
  );
}

const DAY = 86400000;
type DragMode = "move" | "start" | "end";
export function shiftMilestone(
  item: Milestone,
  mode: DragMode,
  days: number,
): Milestone {
  if (!days) return item;
  const start = Date.parse(item.start),
    end = Date.parse(item.end),
    delta = days * DAY;
  return {
    ...item,
    start: new Date(
      mode === "end"
        ? start
        : mode === "start"
          ? Math.min(end - DAY, start + delta)
          : start + delta,
    ).toISOString(),
    end: new Date(
      mode === "start"
        ? end
        : mode === "end"
          ? Math.max(start + DAY, end + delta)
          : end + delta,
    ).toISOString(),
  };
}
function MilestoneRange({
  item,
  left,
  width,
  selected,
  editable,
  onSelect,
  onAdjust,
}: {
  item: Milestone;
  left: number;
  width: number;
  selected: boolean;
  editable: boolean;
  onSelect: () => void;
  onAdjust: (mode: DragMode, days: number) => void;
}) {
  return (
    <div
      className="milestone-range"
      style={{ left: `${left}%`, width: `${width}%` }}
    >
      <TimelineHandle
        item={item}
        mode="move"
        editable={editable}
        selected={selected}
        onSelect={onSelect}
        onAdjust={onAdjust}
      />
      {editable && (
        <>
          <TimelineHandle
            item={item}
            mode="start"
            editable={editable}
            onAdjust={onAdjust}
          />
          <TimelineHandle
            item={item}
            mode="end"
            editable={editable}
            onAdjust={onAdjust}
          />
        </>
      )}
    </div>
  );
}
function TimelineHandle({
  item,
  mode,
  editable,
  selected,
  onSelect,
  onAdjust,
}: {
  item: Milestone;
  mode: DragMode;
  editable: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onAdjust: (mode: DragMode, days: number) => void;
}) {
  const { ref } = useDraggable({
    id: `${item.id}:${mode}`,
    data: { milestoneId: item.id, mode },
    disabled: !editable,
    sensors: [PointerSensor],
    plugins: [Feedback.configure({ feedback: "none" })],
  });
  const label =
    mode === "move"
      ? `Inspect ${item.title}`
      : `Resize ${mode} of ${item.title}`;
  return (
    <Tooltip
      label={`${item.title} · ${item.start.slice(0, 10)} – ${item.end.slice(0, 10)} · ${item.owner || "Unassigned"}${editable ? ` · ${mode === "move" ? "Drag to reschedule" : `Drag to change ${mode}`}` : ""}`}
    >
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={selected}
        className={
          mode === "move"
            ? `milestone-bar ${item.blocked ? "blocked" : ""} ${editable ? "milestone-editable" : ""}`
            : `milestone-grip milestone-grip-${mode}`
        }
        onClick={onSelect}
        onKeyDown={(event) => {
          if (
            editable &&
            (event.key === "ArrowLeft" || event.key === "ArrowRight")
          ) {
            event.preventDefault();
            onAdjust(
              mode,
              (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 7 : 1),
            );
          }
        }}
      >
        {mode === "move" ? (
          <span>{item.owner || item.title}</span>
        ) : (
          <span aria-hidden="true">⋮</span>
        )}
      </button>
    </Tooltip>
  );
}
function MilestoneEditor({
  item,
  items,
  busy,
  onSave,
}: {
  item: Milestone;
  items: Milestone[];
  busy: boolean;
  onSave: (item: Milestone) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(item);
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(item);
    setError("");
  }, [item]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(item);
  const cycle = (id: string, visited = new Set<string>()): boolean => {
    if (id === item.id) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    return (items.find((i) => i.id === id)?.dependencies || []).some(
      (dependency) => cycle(dependency, visited),
    );
  };
  const parse = (value: string) => {
    const time = Date.parse(value);
    return Number.isFinite(time) &&
      new Date(time).toISOString().slice(0, 10) === value.slice(0, 10)
      ? new Date(time).toISOString()
      : null;
  };
  return (
    <form
      className="milestone-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const start = parse(draft.start),
          end = parse(draft.end);
        if (!draft.title.trim() || !start || !end || end < start) {
          setError(
            "Enter a title and valid dates (YYYY-MM-DD), with end on or after start.",
          );
          return;
        }
        if (draft.dependencies?.some((id) => cycle(id))) {
          setError("This dependency would create a cycle.");
          return;
        }
        await onSave({ ...draft, title: draft.title.trim(), start, end });
      }}
    >
      <div className="milestone-editor-fields">
        <Field
          label="Milestone title"
          value={draft.title}
          disabled={busy}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <Field
          label="Milestone owner"
          value={draft.owner || ""}
          disabled={busy}
          onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
        />
        <Field
          label="Start date (YYYY-MM-DD)"
          value={draft.start.slice(0, 10)}
          disabled={busy}
          onChange={(e) => setDraft({ ...draft, start: e.target.value })}
        />
        <Field
          label="End date (YYYY-MM-DD)"
          value={draft.end.slice(0, 10)}
          disabled={busy}
          onChange={(e) => setDraft({ ...draft, end: e.target.value })}
        />
      </div>
      <Checkbox
        label="Milestone blocked"
        checked={!!draft.blocked}
        disabled={busy}
        onChange={(blocked) => setDraft({ ...draft, blocked })}
      />
      <fieldset disabled={busy}>
        <legend>Dependencies</legend>
        {items
          .filter((i) => i.id !== item.id)
          .map((candidate) => (
            <Checkbox
              key={candidate.id}
              label={candidate.title}
              checked={draft.dependencies?.includes(candidate.id) || false}
              disabled={busy}
              onChange={(checked) =>
                setDraft({
                  ...draft,
                  dependencies: checked
                    ? [...(draft.dependencies || []), candidate.id]
                    : draft.dependencies?.filter((id) => id !== candidate.id),
                })
              }
            />
          ))}
      </fieldset>
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="toolbar">
        <Button type="submit" primary disabled={busy || !dirty}>
          Save milestone
        </Button>
        <Button
          disabled={busy || !dirty}
          onClick={() => {
            setDraft(item);
            setError("");
          }}
        >
          Cancel changes
        </Button>
      </div>
    </form>
  );
}
