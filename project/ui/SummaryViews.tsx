import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel, Badge, SourceLink } from "./Layout";
import { Button, Dialog, Select, type Tone } from "./Controls";
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
}: {
  items: Milestone[];
  onSelect?: (id: string) => void;
}) {
  const [zoom, setZoom] = useState("fit");
  const valid = items.filter(
      (i) =>
        Number.isFinite(Date.parse(i.start)) &&
        Number.isFinite(Date.parse(i.end)) &&
        Date.parse(i.end) >= Date.parse(i.start),
    ),
    start = Math.min(...valid.map((i) => Date.parse(i.start))),
    end = Math.max(...valid.map((i) => Date.parse(i.end))),
    span = Math.max(86400000, end - start);
  return (
    <Panel
      title="Milestones & dependencies"
      actions={
        <Select
          label="Timeline zoom"
          value={zoom}
          onChange={setZoom}
          options={[
            { value: "fit", label: "Fit schedule" },
            { value: "detail", label: "Detailed" },
          ]}
        />
      }
    >
      <div className="timeline-scroll">
        <div style={{ minWidth: zoom === "detail" ? 1000 : 400 }}>
          {valid.map((item) => (
            <div className="milestone-row" key={item.id}>
              <Button
                variant="quiet"
                disabled={!onSelect}
                onClick={() => onSelect?.(item.id)}
              >
                {item.title}
              </Button>
              <div className="milestone-track">
                <button
                  className={`milestone-bar ${item.blocked ? "blocked" : ""}`}
                  style={{
                    left: `${((Date.parse(item.start) - start) / span) * 85}%`,
                    width: `${Math.max(6, ((Date.parse(item.end) - Date.parse(item.start)) / span) * 85)}%`,
                  }}
                  onClick={() => onSelect?.(item.id)}
                  disabled={!onSelect}
                  aria-label={`${item.title}: ${item.start} to ${item.end}${item.blocked ? ", blocked" : ""}`}
                >
                  <span>{item.owner}</span>
                </button>
              </div>
              <small className="muted">
                {item.dependencies?.length
                  ? `After ${item.dependencies.join(", ")}`
                  : item.blocked
                    ? "Blocked"
                    : "Ready"}
              </small>
            </div>
          ))}
          {valid.length ? (
            <div className="table-footer muted">
              <span>{new Date(start).toLocaleDateString()}</span>
              <span>{new Date(end).toLocaleDateString()}</span>
            </div>
          ) : (
            <p className="empty-state">No scheduled milestones.</p>
          )}
        </div>
      </div>
    </Panel>
  );
}
export function ProgressTarget({
  title,
  current,
  target,
  unit = "",
  checks = [],
}: {
  title: string;
  current: number | null;
  target: number;
  unit?: string;
  checks?: { id: string; label: string; done: boolean }[];
}) {
  const ratio =
    current === null || target <= 0
      ? null
      : Math.min(100, Math.max(0, (current / target) * 100));
  return (
    <Panel title={title}>
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
      {checks.map((c) => (
        <div key={c.id} className="status-row">
          <span>{c.label}</span>
          <Badge tone={c.done ? "success" : "warning"}>
            {c.done ? "Passed" : "Pending"}
          </Badge>
        </div>
      ))}
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
