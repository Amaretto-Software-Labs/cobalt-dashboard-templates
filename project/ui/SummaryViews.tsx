import { useState } from "react";
import { Collapsible } from "radix-ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel, Badge, SourceLink } from "./Layout";
import {
  Button,
  Dialog,
  Select,
  Checkbox,
  Notice,
  type Tone,
} from "./Controls";
export type ActivityEvent = {
  id: string;
  title: string;
  time: string;
  source: string;
  description?: string;
  url?: string;
};
export function ActivityTimeline({
  events,
  onSelect,
}: {
  events: ActivityEvent[];
  onSelect?: (id: string) => void;
}) {
  const [source, setSource] = useState("all");
  const visible = [...events]
    .filter((e) => source === "all" || e.source === source)
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  return (
    <Panel
      title="Recent activity"
      actions={
        <Select
          label="Activity source"
          value={source}
          onChange={setSource}
          options={[
            { value: "all", label: "All sources" },
            ...[...new Set(events.map((e) => e.source))].map((value) => ({
              value,
              label: value,
            })),
          ]}
        />
      }
    >
      <ol className="activity-list">
        {visible.map((e) => (
          <li key={e.id}>
            <span className="activity-dot" />
            <div>
              {onSelect ? (
                <Button variant="quiet" onClick={() => onSelect(e.id)}>
                  {e.title}
                </Button>
              ) : (
                <b>{e.title}</b>
              )}
              <p className="muted">{e.description}</p>
              <small>
                {e.source} ·{" "}
                <time dateTime={e.time}>
                  {new Date(e.time).toLocaleString()}
                </time>
              </small>
              <SourceLink url={e.url} />
            </div>
          </li>
        ))}
      </ol>
      {!visible.length && (
        <p className="empty-state">No events from this source.</p>
      )}
    </Panel>
  );
}
export type StatusEntity = {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  detail?: string;
};
export function StatusMatrix({
  entities,
  onSelect,
}: {
  entities: StatusEntity[];
  onSelect?: (id: string) => void;
}) {
  return (
    <Panel title="Service health">
      {entities.map((e) => (
        <div className="status-row" key={e.id}>
          <div>
            {onSelect ? (
              <Button variant="quiet" onClick={() => onSelect(e.id)}>
                {e.name}
              </Button>
            ) : (
              e.name
            )}
            <small className="muted">{e.detail}</small>
          </div>
          <Badge
            tone={
              e.status === "healthy"
                ? "success"
                : e.status === "down"
                  ? "danger"
                  : e.status === "degraded"
                    ? "warning"
                    : "neutral"
            }
          >
            {e.status}
          </Badge>
        </div>
      ))}
      {!entities.length && (
        <p className="empty-state">No service observations.</p>
      )}
    </Panel>
  );
}
export { MilestoneTimeline, type Milestone } from "./MilestoneTimeline";
export type ProgressCheck = {
  id: string;
  label: string;
  done: boolean;
  owner?: string;
  detail?: string;
  url?: string;
};
export function ProgressTarget({
  title,
  current,
  target,
  unit = "",
  checks = [],
  onCheckChange,
}: {
  title: string;
  current: number | null;
  target: number;
  unit?: string;
  checks?: ProgressCheck[];
  onCheckChange?: (id: string, done: boolean) => Promise<void>;
}) {
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState("");
  const pending = checks.filter((c) => !c.done).length;
  const visible = checks.filter(
    (c) => filter === "all" || (filter === "passed" ? c.done : !c.done),
  );
  const ratio =
    current === null || target <= 0
      ? null
      : Math.min(100, Math.max(0, (current / target) * 100));
  async function update(check: ProgressCheck, done: boolean) {
    if (!onCheckChange || busy) return;
    setBusy(check.id);
    setError("");
    try {
      await onCheckChange(check.id, done);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <Panel
      title={title}
      actions={
        checks.length ? (
          <Select
            label="Check status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All checks (${checks.length})` },
              { value: "pending", label: `Pending (${pending})` },
              { value: "passed", label: `Passed (${checks.length - pending})` },
            ]}
          />
        ) : undefined
      }
    >
      <p className="large-number">
        {current ?? "—"} / {target} <small>{unit}</small>
      </p>
      {ratio !== null ? (
        <div
          className="bar-track"
          role="progressbar"
          aria-label={title}
          aria-valuenow={ratio}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: ratio + "%" }} />
        </div>
      ) : (
        <p className="muted">Progress unavailable</p>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="progress-checks">
        {visible.map((c) => (
          <Collapsible.Root
            key={c.id}
            className="check-collapsible"
            aria-busy={busy === c.id || undefined}
          >
            <Collapsible.Trigger asChild>
              <button
                type="button"
                className="check-details"
                aria-label={`Inspect ${c.label}`}
              >
                <ChevronRight
                  size={15}
                  className="check-chevron"
                  aria-hidden="true"
                />
                <span className="progress-check-label">
                  {c.label}
                  {c.owner && <small className="muted">{c.owner}</small>}
                </span>
                <Badge tone={c.done ? "success" : "warning"}>
                  {busy === c.id ? "Saving…" : c.done ? "Passed" : "Pending"}
                </Badge>
              </button>
            </Collapsible.Trigger>
            <Collapsible.Content className="check-content">
              <div className="check-content-inner">
                <p>{c.detail || "No additional details supplied."}</p>
                <p className="muted">Owner: {c.owner || "Unassigned"}</p>
                <div className="toolbar check-actions">
                  {onCheckChange && (
                    <Checkbox
                      label={`Mark ${c.label} as passed`}
                      checked={c.done}
                      disabled={!!busy}
                      onChange={(done) => void update(c, done)}
                    />
                  )}
                  <SourceLink url={c.url}>Open source</SourceLink>
                </div>
              </div>
            </Collapsible.Content>
          </Collapsible.Root>
        ))}
        {!visible.length && !!checks.length && (
          <p className="empty-state">No {filter} checks.</p>
        )}
      </div>
      {!!checks.length && checks.length < target && (
        <p className="muted">
          Showing {checks.length} of {target} checks.
        </p>
      )}
    </Panel>
  );
}
export type NarrativeSection = {
  id: string;
  title: string;
  body: string;
  references?: { label: string; url: string }[];
};
export function Narrative({
  title,
  sections,
}: {
  title: string;
  sections: NarrativeSection[];
}) {
  return (
    <Panel title={title}>
      {sections.map((s) => (
        <section className="narrative-section" key={s.id}>
          <h3>{s.title}</h3>
          <p>{s.body}</p>
          {!!s.references?.length && (
            <div className="toolbar">
              {s.references?.map((r) => (
                <SourceLink key={r.url} url={r.url}>
                  {r.label}
                </SourceLink>
              ))}
            </div>
          )}
        </section>
      ))}
      {!sections.length && (
        <p className="empty-state">No briefing available.</p>
      )}
    </Panel>
  );
}
export type DetailRecord = {
  id: string;
  title: string;
  fields: Record<string, unknown>;
  url?: string;
};
export function RecordDetail({
  record,
  onClose,
  onPrevious,
  onNext,
}: {
  record?: DetailRecord;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <Dialog
      title={record?.title || "Record details"}
      open={!!record}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      {record && (
        <>
          <dl className="detail-fields">
            {Object.entries(record.fields).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>
                  {typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : String(value ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
          <SourceLink url={record.url} />
          {(onPrevious || onNext) && (
            <div className="toolbar">
              <Button disabled={!onPrevious} onClick={onPrevious}>
                <ChevronLeft size={15} />
                Previous
              </Button>
              <Button disabled={!onNext} onClick={onNext}>
                Next
                <ChevronRight size={15} />
              </Button>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
