# Dashboard component library

Run `npm run library` and open http://127.0.0.1:7343. This standalone React index has 29 component examples, six base-control families, 12 dashboard compositions, search, priorities, notes and JSON export. It uses explicit illustrative data; it does not connect to Cobalt or mutate workspace data. `npm run library:build` produces `.library-dist/`, independently from the dashboard's `dist/` publication assets.

The full examples render the same components as generated dashboards. Start with `ui/compositions/DashboardComposition.tsx` for composition, `ui/library/ComponentDemo.tsx` for individual-control usage, and `ui/library/SampleDashboard.tsx` for interactive sample wiring. Import controls from `ui/index.tsx`, and import `ui/styles.css` once. Keep synthetic data in `ui/library/fixtures.ts` or the explicitly enabled development adapter; never import it into production dashboard code.

## Building blocks

| Module | Exports and behavior |
| --- | --- |
| `Controls.tsx` | Button, IconButton, Tooltip, Select, Menu, Field, TextArea, Checkbox, Switch, Tabs, Dialog, Notice, Toast, ConfirmAction, SearchField, Refresh. Radix supplies focus management, Escape dismissal, keyboard selection and portals. |
| `Layout.tsx` | Dashboard, Card, Panel, Metric, Badge, State, FilterBar, SourceFreshness, SourceLink. Loading, unknown, empty and failed data have distinct treatment. |
| `Charts.tsx` | TimeSeries (legend, brush, gaps, annotations), Breakdown (value/share), Distribution (histogram and percentiles), Heatmap, Funnel. Selection callbacks can open detail or change scope. |
| `AdvancedCharts.tsx` | ComparisonChart (grouped/stacked bars), CorrelationChart (scatter/bubbles), DonutChart, HierarchyChart (drillable treemap). Controlled selection, animated transitions, tooltips and keyboard selection controls. |
| `ChartPrimitives.tsx` | ChartFrame, ChartSelection, ChartSelectionProps, theme palette and tooltip styles. |
| `DataViews.tsx` | DataTable (sorting, pagination, column visibility, selection, partial results), LogExplorer (search, severity, display pause, follow tail), LogStream (SDK incremental-feed adapter). |
| `Board.tsx` | WorkBoard (pointer/keyboard move and reorder, collapsible lanes with drop-to-expand, async save, failure recovery and undo), applyBoardMove. Supply stable unique IDs and ordered items. Omit `onMove` for read-only sources. |
| `SummaryViews.tsx` | ActivityTimeline, StatusMatrix, MilestoneTimeline, ProgressTarget, Narrative, RecordDetail. Typed records, inspection callbacks and explicit source references. |

Presentation controls receive typed values and callbacks. They do not discover providers or perform external fetches. `TemplateDashboard` is the SDK adapter for `main`, local record persistence and host-confirmed actions. `DashboardComposition` composes the presentation controls. Connected sources remain read-only until the host supports authorized writes; expose their source links.

## Card interactions

Summary cards should lead to useful detail: filter the contributing records, open a record, or inspect the observation's scope, comparison and source. `Metric` accepts `onSelect` with a required `actionLabel` (accessible name and tooltip); pass `selected` for a toggle filter. It supplies semantic button behavior, Enter/Space activation, focus, hover motion, action icon and reduced-motion treatment. A passive metric remains a readable summary when no meaningful action exists. Container panels keep their own nested controls.

For `DashboardComposition`, return `metrics[].drilldown` with a `label` and one of `itemIds` (toggle the record filter), `itemId` (open details), or `fields` (inspect named observation details). Use stable record IDs from the same dataset scope. An empty `itemIds` array is a valid zero-result filter. For remote pagination or a different interaction, compose `Metric` with a callback that executes the appropriately scoped dataset query. Keep filtered scope visible and provide a way to clear it. Inspect the review and board examples in `ui/library/SampleDashboard.tsx` and the fixture contracts in `ui/library/fixtures.ts`.

Verify the result of each action with pointer and keyboard, including clearing filters, zero results, refreshed data, and opening/closing details. Hover effects accompany real behavior. The catalog's samples demonstrate interactions using illustrative data; production handlers and detail fields must use the actual dataset.

## Compose interactive charts

Import the chart components from `ui/index.tsx`. Components accept data and callbacks; keep the filter state in the parent so any chart can drive tables, sibling charts or dataset queries. The new charts accept `selectedId` and `onSelect(id | undefined)`; selecting the active option or Clear chart selection emits `undefined`. Category IDs and record IDs must remain stable across refreshes. Selection controls below SVG charts provide keyboard access to the same actions as pointer clicks.

```tsx
const [group, setGroup] = useState<string>();
const rows = observations.filter(row => !group || row.group === group);
return <>
  <DonutChart categories={totalsByGroup} selectedId={group} onSelect={setGroup} />
  <DataTable rows={rows} columns={columns} rowKey={row => row.id} />
</>;
```

For `TimeSeries`, choose `variant="line" | "area" | "stacked-area"`. Pass `range={{start,end}}` and `onRangeChange(start,end)` together for a controlled brush; use those ISO timestamps to filter sibling panels or rerun a dataset. Reset emits the full data extent. Without a callback, the brush zooms locally. Only stack additive measures with matching units. Null observations render as gaps.

`ComparisonChart` accepts `rows[{id,label,values}]` and `series[{id,label}]`, with grouped/stacked layout and legend toggles. `CorrelationChart` accepts `points[{id,label,x,y,size?}]`, numeric axis labels, and optional size encoding. `DonutChart` accepts nonnegative categories and exposes exact shares. `HierarchyChart` accepts recursive `nodes[{id,label,value?,children?}]`; parent totals derive from children, parent clicks drill in, breadcrumbs navigate back, and leaf selection calls the parent. All use theme tokens and disable chart animation under reduced motion.

The existing `Breakdown`, `Distribution`, `Heatmap` and `Funnel` expose `selectedId` alongside their typed callbacks. Toggle that state in your parent and provide a clear control. Histogram selection IDs are bin labels; heatmap selection IDs are `row + ":" + column`. Use precise bin bounds and stage membership when filtering source records.

For a complete working composition, read `ui/compositions/ChartExplorer.tsx`. It connects chart selection and time brushing to a contribution chart, a total, and a sortable table with record details. Its `ChartRecord` mapping is intended for additive measures with a comparable baseline; `stage` is the zero-based furthest stage reached, and `stageLabels` configures funnel names. Use the smaller chart components for other data shapes or aggregation rules. A zero-result selection stays visible until cleared.

The catalog mounts this same composition with illustrative data for each chart. Service health, cost, release impact and adoption samples also compose it. Published dashboards can provide `DashboardData.analysis = {records, measureLabel, comparisonLabel, unit}` or compose the primitives directly. The chart library never imports sample data. Preview edits do not update already published builds.

## Schedule and checklist exploration

`MilestoneTimeline` supports milestone selection, related-work highlighting, dependency navigation, blocked filtering and fit/detail date zoom. `onSelect(id)` opens the author's deeper record view from the inspector. Supply `onChange(item): Promise<void>` for supported scheduling writes: drag bars to reschedule, resize either edge, or use Left/Right (Shift for a week) on a focused bar or grip. The inline editor changes title, owner, dates, blockers and dependencies, rejects dependency cycles, and provides save/cancel. Pass saved items back through props; failures retain source data and successful edits can be undone. The sample catalog saves these changes in illustrative local state.

`ProgressTarget` filters checks and expands owner/status/detail information inline using independent collapsible rows. Each row supports Enter/Space, animated expansion, reduced motion and source navigation. Supported pass/reopen controls appear inside the expanded row. Check records accept `id`, `label`, `done`, and optional `owner`, `detail`, `url`. Supply `onCheckChange(id, done): Promise<void>` only when a supported save operation exists; pass updated source data back after saving. Pending writes disable edits and failures preserve the current status with an error. The sample catalog wires this callback to clearly labeled illustrative state. Published compositions receive it only from an explicitly configured adapter. Keep progress totals consistent with the dataset scope; partial check lists are labeled separately.

## Dataset contract

Author `datasets/main.js` to return `DashboardData` from `ui/compositions/types.ts`. This is the exact type used by the sample and published compositions. `datasets.json` declares its script and authorized source aliases. `input.params` contains `query`, `range`, `source` and `template`; inspect the actual source schema and implement the relevant filters/aggregation in the dataset script. Do not silently ignore user scope.

- `configured: false` means sources have not been bound; it is not an empty successful result. Once configured, return `configured: true`, with `complete: false` and a `gap` description when only partial results are available.
- `mode: "connected"` and `items` display external or workspace records. Each item needs a stable `id`, `title` and `status`; optional fields include `assignee`, `project`, `priority`, `description`, and an authorized `url`. Adapt arbitrary provider entities to these presentation fields, or compose a custom DataTable with your own typed columns.
- `mode: "records"` uses the host `cards` collection and versioned `save-card` / `delete-card` actions. The Kanban and Delivery flow manifests declare these. Records include a numeric `position` for persisted order. Choose this only when the user wants standalone cards; otherwise connect the actual requested source.
- `metrics`: `{label, value, unit?, change?, trend?, drilldown?}[]`; use `value: null` for unknown values, not zero.
- `trends`: `{id, label, points: {time, value}[], color?}[]`; ISO timestamps and numeric/null values. `trendUnit` labels the axis; `annotations` are `{time, label}[]`.
- `categories`, `funnel`, `bins`, `heatmap`, `milestones`, `activities`, `services`, `sections` and `progress` use the exported types referenced by `DashboardData`. Only return fields used by the selected composition. `compositionPanels` lists each composition's panels.
- `sources`: named source statuses with observation times. Keep stale/missing sources visible. A failed source must not produce a healthy status or fabricated zero.
- `events` displays a finite log window. Set `eventsDatasetKey` for a real incremental feed: that script receives `input.checkpoint` and returns the SDK `{events, checkpoint, complete, gap?}` contract. The LogStream adapter continues collecting while the display is paused. It stops on unmount.

The sample fixtures illustrate presentation shapes only. Discover the user's native, provider or MCP sources, probe their real responses with `npm run dataset:test -- main --params '{}'`, then validate the mapping in the normal task preview. Never copy sample observations into a production dataset.

## Validation

`npm test` checks controls, failed writes, local host action versions, read-only sources and all compositions with populated/empty data. `npm run library:build` checks the index. `npm run test:browser` runs pointer/keyboard drag and catalog navigation regression tests against the library; install Chromium with `npx playwright install chromium` first. Root `node scripts/check.mjs` additionally scaffolds, tests, builds and packages every catalog entry and checks that library fixtures are absent from published JavaScript. Test saved assets and live data in Cobalt separately before publication.

Cobalt owns the dashboard-wide Refresh/Stop control and Share menu in the breadcrumb header. Do not repeat the Private/Workspace visibility label inside the dashboard. Do not add another Refresh or Stop button inside the dashboard. Keep contextual retry, filtering, and stream pause controls where they apply; reload the task preview to refresh during standalone development.
