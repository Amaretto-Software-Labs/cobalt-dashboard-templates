import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Blocks,
  SlidersHorizontal,
  ListChecks,
  ArrowLeft,
  Sun,
  Moon,
  Download,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  Select,
  SearchField,
  TextArea,
  Notice,
  Tabs,
} from "../Controls";
import { Badge, Metric } from "../Layout";
import { components } from "./catalog";
import { dashboards, type DashboardKind } from "../compositions/catalog";
import { SampleDashboard } from "./SampleDashboard";
import { ComponentDemo } from "./ComponentDemo";
import { fixture } from "./fixtures";
import "./library.css";
type Priority = "unranked" | "now" | "next" | "later" | "skip";
type Decisions = {
  priorities: Record<string, Priority>;
  notes: Record<string, string>;
};
const empty: Decisions = { priorities: {}, notes: {} };
const priorityOptions = [
  { value: "unranked", label: "Set priority" },
  { value: "now", label: "Now" },
  { value: "next", label: "Next" },
  { value: "later", label: "Later" },
  { value: "skip", label: "Not needed" },
];
const baseIds = ["buttons", "select", "menu", "forms", "tabs", "feedback"];
function useHash() {
  const [hash, setHash] = useState(location.hash.slice(1) || "dashboards");
  useEffect(() => {
    const update = () => setHash(location.hash.slice(1) || "dashboards");
    addEventListener("hashchange", update);
    return () => removeEventListener("hashchange", update);
  }, []);
  return hash;
}
export default function Library() {
  const hash = useHash(),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [priority, setPriority] = useState("all"),
    [light, setLight] = useState(false),
    [storageError, setStorageError] = useState("");
  const [decisions, setDecisions] = useState<Decisions>(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem("cobalt-react-library-decisions") || "null",
      );
      return data?.priorities && data?.notes ? data : empty;
    } catch {
      return empty;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        "cobalt-react-library-decisions",
        JSON.stringify(decisions),
      );
    } catch {
      setStorageError(
        "Browser storage is unavailable. Export your choices before leaving.",
      );
    }
  }, [decisions]);
  useEffect(() => {
    document.documentElement.dataset.colorScheme = light ? "light" : "dark";
  }, [light]);
  const key = (kind: string, id: string) => `${kind}:${id}`;
  const choose = (id: string, value: Priority) =>
    setDecisions((d) => ({
      ...d,
      priorities: { ...d.priorities, [id]: value },
    }));
  const ranked = Object.values(decisions.priorities).filter(
    (v) => v !== "unranked",
  ).length;
  const [route, id] = hash.split("/");
  const item =
    route === "dashboard"
      ? dashboards.find((d) => d.id === id)
      : route === "component"
        ? components.find((c) => c.id === id)
        : undefined;
  const now = dashboards.filter(
    (d) => decisions.priorities[key("dashboard", d.id)] === "now",
  );
  const required = components
    .map((c) => ({
      component: c,
      usedBy: now.filter((d) => (d.uses as readonly string[]).includes(c.id)),
    }))
    .filter((c) => c.usedBy.length)
    .sort((a, b) => b.usedBy.length - a.usedBy.length);
  const visible = (
    route === "dashboards"
      ? dashboards.map((d) => ({ ...d, kind: "dashboard" }))
      : components
          .filter((c) => route !== "base" || baseIds.includes(c.id))
          .map((c) => ({ ...c, kind: "component" }))
  ).filter(
    (x) =>
      (category === "all" || x.group === category) &&
      JSON.stringify(x).toLowerCase().includes(query.toLowerCase()) &&
      (priority === "all" ||
        (decisions.priorities[key(x.kind, x.id)] || "unranked") === priority),
  );
  const exportPlan = () => {
    const blob = new Blob(
        [
          JSON.stringify(
            {
              version: 1,
              exportedAt: new Date().toISOString(),
              ...decisions,
              requiredComponents: required.map((c) => ({
                id: c.component.id,
                dashboards: c.usedBy.map((d) => d.id),
              })),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "cobalt-library-priorities.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  function priorityControl(id: string, title: string) {
    return (
      <Select
        label={`Priority for ${title}`}
        value={decisions.priorities[id] || "unranked"}
        onChange={(v) => choose(id, v as Priority)}
        options={priorityOptions}
      />
    );
  }
  return (
    <div className="library">
      <header className="library-header">
        <a className="library-brand" href="#dashboards">
          <span className="cobalt-mark">C</span>Cobalt
          <span>Dashboard library</span>
        </a>
        <div className="toolbar">
          <Badge tone="accent">React components</Badge>
          <Button
            icon={light ? <Moon size={15} /> : <Sun size={15} />}
            onClick={() => setLight(!light)}
          >
            {light ? "Dark" : "Light"} mode
          </Button>
          <Button primary icon={<Download size={15} />} onClick={exportPlan}>
            Export priorities
          </Button>
        </div>
      </header>
      <div className="library-shell">
        <aside className="library-nav">
          <small>LIBRARY</small>
          {[
            {
              id: "dashboards",
              label: "Sample dashboards",
              icon: LayoutGrid,
              count: dashboards.length,
            },
            {
              id: "components",
              label: "Components",
              icon: Blocks,
              count: components.length,
            },
            {
              id: "base",
              label: "Base controls",
              icon: SlidersHorizontal,
              count: 6,
            },
            {
              id: "priorities",
              label: "My priorities",
              icon: ListChecks,
              count: ranked,
            },
            { id: "quality", label: "Quality standard", icon: ShieldCheck },
          ].map((nav) => (
            <a
              key={nav.id}
              href={"#" + nav.id}
              aria-current={route === nav.id ? "page" : undefined}
              onClick={() => {
                setQuery("");
                setCategory("all");
                setPriority("all");
              }}
            >
              <nav.icon size={17} />
              {nav.label}
              <span>{nav.count}</span>
            </a>
          ))}
          <div className="library-nav-note">
            <b>
              {ranked} of {components.length + dashboards.length} prioritized
            </b>
            <p>
              Real React controls and compositions. Sample data is isolated from
              the Cobalt host.
            </p>
          </div>
        </aside>
        <div className="library-main">
          {storageError && <Notice tone="warning">{storageError}</Notice>}
          {item ? (
            <>
              <a
                className="back-link"
                href={route === "dashboard" ? "#dashboards" : "#components"}
              >
                <ArrowLeft size={15} />
                Back to {route === "dashboard" ? "dashboards" : "components"}
              </a>
              <div className="library-detail">
                <section>
                  <div className="eyebrow">
                    {route === "dashboard"
                      ? "Shared-component composition"
                      : "Reusable React component"}
                  </div>
                  {route === "dashboard" ? (
                    <SampleDashboard key={id} kind={id as DashboardKind} />
                  ) : (
                    <>
                      <h1>{item.title}</h1>
                      <p className="library-lead">{item.description}</p>
                      <Notice tone="accent">
                        Interactive component example · Same implementation used
                        in the templates.
                      </Notice>
                      <div style={{ marginTop: 24 }}>
                        <ComponentDemo key={id} id={id} />
                      </div>
                    </>
                  )}
                </section>
                <aside className="library-spec">
                  <h3>Your priority</h3>
                  {priorityControl(key(route, id), item.title)}
                  <TextArea
                    label="Your notes"
                    value={decisions.notes[key(route, id)] || ""}
                    onChange={(note) =>
                      setDecisions((d) => ({
                        ...d,
                        notes: { ...d.notes, [key(route, id)]: note },
                      }))
                    }
                  />
                  <h3>Source</h3>
                  <code>
                    {route === "dashboard"
                      ? "ui/compositions/DashboardComposition.tsx"
                      : "ui/index.tsx"}
                  </code>
                  {"contract" in item && (
                    <>
                      <h3>Component inputs</h3>
                      <code>{item.contract}</code>
                    </>
                  )}
                  <h3>
                    {route === "dashboard"
                      ? "Composed from"
                      : "Used in samples"}
                  </h3>
                  {route === "dashboard" && "uses" in item
                    ? item.uses.map((componentId) => (
                        <a key={componentId} href={"#component/" + componentId}>
                          {components.find((c) => c.id === componentId)?.title}
                          <ArrowUpRight size={13} />
                        </a>
                      ))
                    : dashboards
                        .filter((d) =>
                          (d.uses as readonly string[]).includes(id),
                        )
                        .map((d) => (
                          <a key={d.id} href={"#dashboard/" + d.id}>
                            {d.title}
                            <ArrowUpRight size={13} />
                          </a>
                        ))}
                  {baseIds.includes(id) && (
                    <p>Shared foundation for the dashboard components.</p>
                  )}
                  <h3>Data boundary</h3>
                  <p>
                    Components receive typed data and callbacks. Dataset scripts
                    and the SDK handle workspace and MCP access.
                  </p>
                </aside>
              </div>
            </>
          ) : route === "priorities" ? (
            <>
              <h1>Your build priorities</h1>
              <p className="library-lead">
                The shared dependencies below come from your “Now” dashboards.
                Component choices remain independent.
              </p>
              <div className="metric-grid">
                <Metric
                  label="Now"
                  value={
                    Object.values(decisions.priorities).filter(
                      (v) => v === "now",
                    ).length
                  }
                />
                <Metric
                  label="Next"
                  value={
                    Object.values(decisions.priorities).filter(
                      (v) => v === "next",
                    ).length
                  }
                />
                <Metric
                  label="Unranked"
                  value={components.length + dashboards.length - ranked}
                />
              </div>
              <h2 className="section-title">Shared components for Now</h2>
              <div className="dependency-list">
                {required.map(({ component, usedBy }) => (
                  <a href={"#component/" + component.id} key={component.id}>
                    {component.title}
                    <Badge>{usedBy.length}</Badge>
                    {decisions.priorities[key("component", component.id)] ===
                      "skip" && <Badge tone="warning">Marked not needed</Badge>}
                  </a>
                ))}
                {!required.length && (
                  <Notice>
                    Choose a dashboard as “Now” to see its dependencies.
                  </Notice>
                )}
              </div>
              <h2 className="section-title">Decisions</h2>
              {[
                ...dashboards.map((d) => ({ ...d, kind: "dashboard" })),
                ...components.map((c) => ({ ...c, kind: "component" })),
              ]
                .filter(
                  (x) =>
                    decisions.priorities[key(x.kind, x.id)] &&
                    decisions.priorities[key(x.kind, x.id)] !== "unranked",
                )
                .map((x) => (
                  <div className="decision-row" key={key(x.kind, x.id)}>
                    <a href={"#" + x.kind + "/" + x.id}>{x.title}</a>
                    <p>{decisions.notes[key(x.kind, x.id)]}</p>
                    {priorityControl(key(x.kind, x.id), x.title)}
                  </div>
                ))}
            </>
          ) : route === "quality" ? (
            <>
              <h1>Quality standard</h1>
              <p className="library-lead">
                The library is the test surface for the same code that generated
                dashboards ship.
              </p>
              <div className="catalog-grid">
                {[
                  [
                    "Native to Cobalt",
                    "Shared Cobalt tokens, controls and Lucide icons. Radix handles focus, keyboard navigation, portals and dismiss behavior.",
                  ],
                  [
                    "Data stays honest",
                    "Unknown values remain unknown. Missing sources, partial feeds, gaps, and stale data are explicit. Fixtures are never silently substituted in a published view.",
                  ],
                  [
                    "Useful interaction",
                    "Board movement and undo, table sorting and pagination, chart inspection and range selection, record details and source links.",
                  ],
                  [
                    "Clear actions",
                    "Writes use explicit callbacks and Cobalt’s host action contract. Connected sources expose no unsupported write controls. Failed board writes restore the original ordering.",
                  ],
                  [
                    "Composable React",
                    "Typed presentation components, shared dashboard compositions, and explicit dataset contracts. No provider-specific fetch code in the browser.",
                  ],
                  [
                    "Motion & verification",
                    "Reduced-motion support, pointer and keyboard workflows, interaction tests, and saved-asset build checks.",
                  ],
                ].map(([title, body]) => (
                  <section className="catalog-card quality-card" key={title}>
                    <h2>{title}</h2>
                    <p>{body}</p>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="eyebrow">Cobalt / Dashboard library</div>
              <h1>
                {route === "dashboards"
                  ? "Useful dashboards. Shared building blocks."
                  : route === "base"
                    ? "Polished controls. Consistent interactions."
                    : "A component library worth composing."}
              </h1>
              <p className="library-lead">
                Explore the real React collection, test the interactions, and
                prioritize what matters. Each dashboard is composed from the
                components in this library.
              </p>
              <Notice tone="accent">
                Library samples use illustrative data. Generated templates
                connect through the Cobalt SDK.
              </Notice>
              <div className="library-filters">
                <SearchField
                  value={query}
                  onChange={setQuery}
                  placeholder="Search the library…"
                />
                <Select
                  label="Category"
                  value={category}
                  onChange={setCategory}
                  options={[
                    "all",
                    ...(route === "dashboards"
                      ? ["Delivery", "Operations", "Business", "Custom"]
                      : ["Foundation", "Visualize", "Explore", "Coordinate"]),
                  ].map((value) => ({
                    value,
                    label: value === "all" ? "All categories" : value,
                  }))}
                />
                <Select
                  label="Filter priority"
                  value={priority}
                  onChange={setPriority}
                  options={[
                    { value: "all", label: "All priorities" },
                    ...priorityOptions,
                  ]}
                />
              </div>
              <p className="muted" role="status">
                {visible.length} results
              </p>
              {!visible.length && (
                <Notice>
                  No matches. Try another search or clear the filters.
                </Notice>
              )}
              <div className="catalog-grid">
                {visible.map((x) => (
                  <article className="catalog-card" key={x.id}>
                    <a
                      className="catalog-preview"
                      href={"#" + x.kind + "/" + x.id}
                      aria-label={`Preview ${x.title}`}
                    >
                      <Thumbnail id={x.id} kind={x.kind} />
                      <span>
                        Explore <ArrowUpRight size={13} />
                      </span>
                    </a>
                    <div className="catalog-card-body">
                      <div className="catalog-card-title">
                        <h2>{x.title}</h2>
                        <Badge>{x.group}</Badge>
                      </div>
                      <p>{x.description}</p>
                      <footer>
                        <a href={"#" + x.kind + "/" + x.id}>
                          Explore{" "}
                          {x.kind === "dashboard" ? "composition" : "component"}{" "}
                          ↗
                        </a>
                        {priorityControl(key(x.kind, x.id), x.title)}
                      </footer>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function Thumbnail({ id, kind }: { id: string; kind: string }) {
  const data = fixture(
    kind === "dashboard" ? (id as DashboardKind) : "service",
  );
  return (
    <div className="thumbnail">
      <small>
        {kind === "dashboard" ? "SAMPLE COMPOSITION" : "REUSABLE COMPONENT"}
      </small>
      {kind === "component" && baseIds.includes(id) ? (
        <div className="thumbnail-controls">
          <span className="cobalt-button cobalt-button--primary">Create</span>
          <span className="cobalt-button">Save</span>
          <span className="ui-select">
            Production <SlidersHorizontal size={13} />
          </span>
          <span className="thumbnail-line" />
        </div>
      ) : id === "work" || id === "board" ? (
        <div className="thumbnail-board">
          {["To do", "In progress", "Done"].map((lane, i) => (
            <div key={lane}>
              <small>{lane}</small>
              <p>{data.items?.[i]?.title}</p>
              <p>Follow up</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="thumbnail-metrics">
            {data.metrics?.slice(0, 2).map((m) => (
              <Metric key={m.label} {...m} />
            ))}
          </div>
          <svg viewBox="0 0 250 40" aria-hidden="true">
            <polyline
              points="0,35 15,33 30,24 45,27 60,18 75,25 90,17 105,19 120,12 135,16 150,7 165,15 180,9 195,4 210,8 225,2 250,5"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
            />
          </svg>
        </>
      )}
    </div>
  );
}
