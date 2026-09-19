import { ChartExplorer } from "../compositions/ChartExplorer";
import { chartFixture } from "./chartFixtures";
import { useState } from "react";
import {
  Copy,
  Plus,
  RefreshCw,
  Trash2,
  Mail,
  LayoutGrid,
  Activity,
} from "lucide-react";
import {
  Button,
  IconButton,
  Select,
  Menu,
  Field,
  TextArea,
  Checkbox,
  Switch,
  Tabs,
  Toast,
  Notice,
  ConfirmAction,
  Refresh,
} from "../Controls";
import { Metric, FilterBar, SourceFreshness, Panel } from "../Layout";
import { DataTable, LogExplorer } from "../DataViews";

import { WorkBoard, applyBoardMove } from "../Board";
import {
  ActivityTimeline,
  StatusMatrix,
  MilestoneTimeline,
  ProgressTarget,
  Narrative,
  RecordDetail,
  type DetailRecord,
} from "../SummaryViews";
import { RecordEditor } from "../compositions/RecordEditor";
import { fixture } from "./fixtures";
import type { Item } from "@cobalt-code/dashboard";
export function ComponentDemo({ id }: { id: string }) {
  const [data] = useState(() => fixture("service")),
    [items, setItems] = useState(() => fixture("work").items!),
    [milestones, setMilestones] = useState(
      () => fixture("service").milestones!,
    ),
    [checks, setChecks] = useState(() => fixture("service").progress!.checks!),
    [editing, setEditing] = useState<Item>(),
    [detail, setDetail] = useState<DetailRecord>(),
    [query, setQuery] = useState(""),
    [range, setRange] = useState("24h"),
    [source, setSource] = useState("all"),
    [environment, setEnvironment] = useState("prod"),
    [tab, setTab] = useState("overview"),
    [checked, setChecked] = useState(true),
    [enabled, setEnabled] = useState(true),
    [message, setMessage] = useState(""),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [failAction, setFailAction] = useState(false);
  const inspect = (title: string, fields: Record<string, unknown>) =>
    setDetail({ id: title, title, fields });
  const simulate = async () => {
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setBusy(false);
    setMessage("Sample action completed.");
  };
  const views: Record<string, () => React.ReactNode> = {
    area: () => <ChartExplorer records={chartFixture()} initialView="area" />,
    comparison: () => (
      <ChartExplorer records={chartFixture()} initialView="comparison" />
    ),
    scatter: () => (
      <ChartExplorer records={chartFixture()} initialView="scatter" />
    ),
    donut: () => <ChartExplorer records={chartFixture()} initialView="donut" />,
    treemap: () => (
      <ChartExplorer records={chartFixture()} initialView="treemap" />
    ),
    metric: () => (
      <div className="metric-grid">
        {data.metrics?.map((m) => (
          <Metric
            key={m.label}
            {...m}
            trend={[12, 18, 15, 24, 20, 28]}
            actionLabel="Inspect observation and source"
            onSelect={() =>
              inspect(m.label, {
                Value: m.value,
                Unit: m.unit,
                Comparison: m.change,
                "Observed at": data.updatedAt,
                Source: "Illustrative library data",
              })
            }
          />
        ))}
      </div>
    ),
    series: () => (
      <ChartExplorer records={chartFixture()} initialView="series" />
    ),
    table: () => (
      <DataTable
        rows={Array.from({ length: 4 }, (_, n) =>
          items.map((i) => ({ ...i, id: i.id + "-" + n })),
        ).flat()}
        columns={[
          {
            key: "title",
            label: "Title",
            render: (i) => i.title,
            sortValue: (i) => i.title,
          },
          {
            key: "status",
            label: "Status",
            render: (i) => i.status,
            sortValue: (i) => i.status,
          },
          {
            key: "owner",
            label: "Owner",
            render: (i) => i.assignee,
            sortValue: (i) => i.assignee || "",
          },
        ]}
        rowKey={(i) => i.id}
        onSelect={(i) => inspect(i.title, i)}
      />
    ),
    board: () => (
      <Panel
        title="Interactive work board"
        actions={
          <Button
            primary
            icon={<Plus size={15} />}
            onClick={() => setEditing({ id: "", title: "", status: "To do" })}
          >
            New card
          </Button>
        }
      >
        <SearchFieldDemo query={query} onQuery={setQuery} />
        <WorkBoard
          items={items.filter((i) =>
            i.title.toLowerCase().includes(query.toLowerCase()),
          )}
          lanes={["To do", "In progress", "Done"]}
          onSelect={(i) => setEditing(i as Item)}
          onMove={async (change) => {
            if (failAction) throw new Error("Sample version conflict");
            setItems((current) => applyBoardMove(current, change));
          }}
        />
        <Switch
          label="Simulate a failed write"
          checked={failAction}
          onChange={setFailAction}
        />
      </Panel>
    ),
    logs: () => (
      <>
        <Button
          onClick={() =>
            setMessage("Use the Incoming event button to test display pause.")
          }
        >
          How to test pause
        </Button>
        <LogDemo />
      </>
    ),
    activity: () => (
      <ActivityTimeline
        events={data.activities!}
        onSelect={(id) => {
          const e = data.activities!.find((e) => e.id === id)!;
          inspect(e.title, e);
        }}
      />
    ),
    status: () => (
      <StatusMatrix
        entities={data.services!}
        onSelect={(id) =>
          inspect(
            id,
            data.services!.find((e) => e.id === id)!,
          )
        }
      />
    ),
    breakdown: () => (
      <ChartExplorer records={chartFixture()} initialView="breakdown" />
    ),
    distribution: () => (
      <ChartExplorer records={chartFixture()} initialView="distribution" />
    ),
    heatmap: () => (
      <ChartExplorer records={chartFixture()} initialView="heatmap" />
    ),
    timeline: () => (
      <MilestoneTimeline
        items={milestones}
        onChange={async (item) =>
          setMilestones((current) =>
            current.map((i) => (i.id === item.id ? item : i)),
          )
        }
        onSelect={(id) =>
          inspect(
            id,
            milestones.find((e) => e.id === id)!,
          )
        }
      />
    ),
    funnel: () => (
      <ChartExplorer records={chartFixture()} initialView="funnel" />
    ),
    narrative: () => (
      <Narrative title="Today’s briefing" sections={data.sections!} />
    ),
    progress: () => (
      <ProgressTarget
        {...data.progress!}
        checks={checks}
        current={checks.filter((c) => c.done).length}
        target={checks.length}
        onCheckChange={async (id, done) =>
          setChecks((current) =>
            current.map((c) => (c.id === id ? { ...c, done } : c)),
          )
        }
      />
    ),
    filters: () => (
      <>
        <FilterBar
          query={query}
          onQuery={setQuery}
          range={range}
          onRange={setRange}
          source={source}
          onSource={setSource}
          sources={["Checkout", "Billing", "Platform"]}
        />
        <Notice>
          Current query: {JSON.stringify({ query, range, source })}
        </Notice>
      </>
    ),
    freshness: () => (
      <SourceFreshness
        sources={data.sources!}
        onRetry={async (id) => {
          await simulate();
          setMessage(`Sample retry completed for ${id}.`);
        }}
      />
    ),
    detail: () => (
      <Panel title="Inspect records without losing context">
        <Button onClick={() => inspect(items[0].title, items[0])}>
          Open record detail
        </Button>
      </Panel>
    ),
    actions: () => (
      <div className="form-grid">
        <Switch
          label="Simulate a conflict"
          checked={failAction}
          onChange={setFailAction}
        />
        <ConfirmAction
          label="Mark complete"
          description="Change this sample card from In progress to Done?"
          onConfirm={async () => {
            if (failAction)
              throw new Error("This record changed. Refresh before retrying.");
            setMessage("Sample action confirmed.");
          }}
        />
      </div>
    ),
    buttons: () => (
      <Panel title="Action hierarchy">
        <div className="demo-stack">
          <div className="toolbar">
            <Button
              primary
              busy={busy}
              icon={<Plus size={15} />}
              onClick={() => void simulate()}
            >
              Create dashboard
            </Button>
            <Button onClick={() => setMessage("Sample changes saved.")}>
              Save changes
            </Button>
            <Button variant="quiet" onClick={() => setMessage("Cancelled.")}>
              Cancel
            </Button>
          </div>
          <div className="toolbar">
            <IconButton
              label="Refresh sample data"
              onClick={() => void simulate()}
              busy={busy}
            >
              <RefreshCw size={16} />
            </IconButton>
            <IconButton
              label="Copy sample link"
              onClick={() => setMessage("Sample link copied.")}
            >
              <Copy size={16} />
            </IconButton>
            <ConfirmAction
              label="Remove sample"
              danger
              description="Remove this illustrative item? No saved dashboard is changed."
              onConfirm={async () => setMessage("Sample removed.")}
            />
            <Button disabled>Already saved</Button>
          </div>
        </div>
      </Panel>
    ),
    select: () => (
      <Panel title="Selection controls">
        <div className="form-grid">
          <label className="ui-field">
            Environment
            <Select
              label="Environment"
              value={environment}
              onChange={setEnvironment}
              options={[
                { value: "prod", label: "Production" },
                { value: "staging", label: "Staging" },
                { value: "dev", label: "Development" },
              ]}
            />
          </label>
          <label className="ui-field">
            Time range
            <Select
              label="Demo time range"
              value={range}
              onChange={setRange}
              options={[
                { value: "24h", label: "Last 24 hours" },
                { value: "7d", label: "Last 7 days" },
              ]}
            />
          </label>
          <Select
            label="Unavailable source"
            disabled
            value="none"
            onChange={() => {}}
            options={[{ value: "none", label: "Connect a source first" }]}
          />
          <Notice>
            {environment} · {range}
          </Notice>
        </div>
      </Panel>
    ),
    menu: () => (
      <Panel title="Contextual actions">
        <div className="dashboard-heading">
          <div>
            <h3>Production health</h3>
            <small className="muted">Sample record</small>
          </div>
          <Menu
            label="Dashboard actions"
            items={[
              {
                id: "duplicate",
                label: "Duplicate sample",
                icon: <Copy size={15} />,
                onSelect: () => setMessage("Sample duplicated."),
              },
              {
                id: "refresh",
                label: "Refresh sample",
                icon: <RefreshCw size={15} />,
                onSelect: () => void simulate(),
              },
              {
                id: "remove",
                label: "Remove sample…",
                icon: <Trash2 size={15} />,
                danger: true,
                onSelect: () => setTab("remove"),
              },
            ]}
          />
        </div>
        {tab === "remove" && (
          <ConfirmAction
            label="Remove sample"
            danger
            description="Confirm removal of this illustrative record."
            onConfirm={async () => {
              setTab("overview");
              setMessage("Sample removed.");
            }}
          />
        )}
      </Panel>
    ),
    forms: () => (
      <Panel title="Form fields & validation">
        <form
          className="form-grid"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(
              !name.trim()
                ? "Enter a dashboard name."
                : email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                  ? "Enter a valid email."
                  : "",
            );
            if (
              name.trim() &&
              (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            )
              setMessage("Sample preferences saved.");
          }}
        >
          <Field
            label="Dashboard name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            hint="Shown in the sidebar and header."
            error={error.includes("name") ? error : undefined}
          />
          <Field
            label="Notification email"
            type="email"
            icon={<Mail size={15} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error.includes("email") ? error : undefined}
          />
          <Checkbox
            label="Include a summary"
            checked={checked}
            onChange={setChecked}
          />
          <Switch
            label="Auto-refresh"
            hint="Keep panels up to date while open."
            checked={enabled}
            onChange={setEnabled}
          />
          <Button primary type="submit">
            Save preferences
          </Button>
        </form>
      </Panel>
    ),
    tabs: () => (
      <Panel title="Panel navigation">
        <Tabs
          label="Panel views"
          value={tab}
          onChange={setTab}
          tabs={[
            {
              id: "overview",
              label: "Overview",
              icon: <LayoutGrid size={14} />,
              content: <Metric label="Active work" value={items.length} />,
            },
            {
              id: "activity",
              label: "Activity",
              icon: <Activity size={14} />,
              content: <ActivityTimeline events={data.activities!} />,
            },
            {
              id: "settings",
              label: "Settings",
              content: (
                <Switch
                  label="Show comparison"
                  checked={enabled}
                  onChange={setEnabled}
                />
              ),
            },
          ]}
        />
      </Panel>
    ),
    feedback: () => (
      <div className="demo-stack">
        <Notice tone="success">All sources are connected.</Notice>
        <Notice tone="warning">Observability data is 18 minutes old.</Notice>
        <Notice
          tone="danger"
          action={<Refresh loading={busy} onClick={() => void simulate()} />}
        >
          The billing source could not be reached.
        </Notice>
        <Button
          onClick={() => setMessage("Sample changes saved successfully.")}
        >
          Show success toast
        </Button>
      </div>
    ),
  };
  return (
    <div className="component-demo">
      {views[id]?.() || <Notice>No example registered.</Notice>}
      <RecordEditor
        record={editing}
        onClose={() => setEditing(undefined)}
        lanes={["To do", "In progress", "Done"]}
        onSave={async (record) =>
          setItems((current) =>
            record.id
              ? current.map((i) => (i.id === record.id ? record : i))
              : [...current, { ...record, id: crypto.randomUUID() }],
          )
        }
        onDelete={async (record) =>
          setItems((current) => current.filter((i) => i.id !== record.id))
        }
      />
      <RecordDetail record={detail} onClose={() => setDetail(undefined)} />
      <Toast message={message} onClose={() => setMessage("")} />
    </div>
  );
}
function SearchFieldDemo({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (query: string) => void;
}) {
  return (
    <Field
      label="Search cards"
      value={query}
      onChange={(e) => onQuery(e.target.value)}
    />
  );
}
function LogDemo() {
  const [events, setEvents] = useState(() => fixture("service").events!);
  return (
    <div className="demo-stack">
      <Button
        icon={<Plus size={15} />}
        onClick={() =>
          setEvents((current) =>
            [
              {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                level: "info",
                service: "Checkout",
                message: "New illustrative event",
              },
              ...current,
            ].slice(0, 100),
          )
        }
      >
        Incoming event
      </Button>
      <LogExplorer events={events} observedAt={events[0]?.timestamp} />
    </div>
  );
}
