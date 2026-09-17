import type { Item } from "@cobalt-code/dashboard";
import type { DashboardData } from "../compositions/types";
import type { DashboardKind } from "../compositions/catalog";
export function fixture(kind: DashboardKind, range = "24h"): DashboardData {
  const now = Date.now(),
    time = (hours: number) => new Date(now - hours * 3600000).toISOString();
  const items: Item[] = [
    ["CB-142", "Ship dashboard preview", "In progress", "Maya", "Platform"],
    ["CB-139", "Reduce checkout latency", "In progress", "Luca", "Checkout"],
    ["CB-151", "Review billing migration", "To do", "Aisha", "Billing"],
    ["CB-146", "Add release health checks", "To do", "Maya", "Platform"],
    ["CB-137", "Resolve retry storm", "Done", "Sam", "Checkout"],
    ["CB-132", "Update onboarding flow", "Done", "Luca", "Identity"],
  ].map(([id, title, status, assignee, project], i) => ({
    id,
    title,
    status,
    assignee,
    project,
    priority: i % 3 === 0 ? "High" : "Medium",
    position: i,
    description:
      "Illustrative record for the component library. Changes do not affect a connected source.",
  }));
  const rows = ["Mon", "Tue", "Wed", "Thu", "Fri"],
    columns = ["08", "10", "12", "14", "16", "18", "20"];
  const data: DashboardData = {
    configured: true,
    mode: "connected",
    items,
    columns: ["To do", "In progress", "Done"],
    complete: true,
    updatedAt: time(0),
    metrics: [
      { label: "Availability", value: "99.94%", change: "Target 99.90%" },
      { label: "Requests / min", value: "12.8k", change: "+8.2% vs previous" },
      {
        label: "p95 latency",
        value: 284,
        unit: "ms",
        change: "+41 ms vs previous",
      },
      { label: "Error rate", value: "0.42%", change: "+0.18 pp vs previous" },
    ],
    trends: ["p95", "baseline"].map((id, k) => ({
      id,
      label: k ? "Previous period" : "p95 latency",
      points: Array.from({ length: 24 }, (_, i) => ({
        time: time((23 - i) * (range === "7d" ? 7 : range === "30d" ? 30 : 1)),
        value: Math.round(
          150 + i * 4 + Math.sin(i * 0.9) * 30 + (i === 17 ? 65 : 0) - k * 35,
        ),
      })),
    })),
    trendUnit: "ms",
    annotations: [
      {
        time: time(6 * (range === "7d" ? 7 : range === "30d" ? 30 : 1)),
        label: "Deploy v2.8.1",
      },
    ],
    categories: [
      ["Checkout", 68],
      ["Billing", 19],
      ["Identity", 9],
      ["Platform", 4],
    ].map(([label, value]) => ({
      id: String(label),
      label: String(label),
      value: Number(value),
    })),
    bins: [8, 20, 54, 98, 120, 85, 57, 35, 16, 8].map((count, i) => ({
      label: `${i * 50}–${i * 50 + 50}`,
      count,
    })),
    percentiles: { p50: 142, p95: 284, p99: 481 },
    heatmap: {
      rows,
      columns,
      cells: rows.flatMap((row, r) =>
        columns.map((column, c) => ({
          row,
          column,
          value: (r * 31 + c * 17) % 100,
        })),
      ),
    },
    funnel: [
      ["Signed up", 12420],
      ["Connected a source", 9874],
      ["Created first task", 8466],
      ["Returned in week 2", 6210],
    ].map(([label, value]) => ({
      id: String(label),
      label: String(label),
      value: Number(value),
    })),
    milestones: [
      ["api", "API & schema", 0, 3],
      ["ui", "Dashboard UI", 1, 5],
      ["checks", "Release checks", 5, 7],
      ["rollout", "Rollout", 7, 8],
    ].map(([id, title, start, end], i) => ({
      id: String(id),
      title: String(title),
      start: time(-Number(start) * 24),
      end: time(-Number(end) * 24),
      owner: ["Maya", "Luca", "Aisha", "Sam"][i],
      blocked: i === 2,
      dependencies: i ? [["api", "ui", "checks"][i - 1]] : [],
    })),
    activities: [
      ["Merged #284", "GitHub", "Dashboard runtime reviewed"],
      ["Release v2.8.1 deployed", "Deployments", "Production · eu-west"],
      ["Checkout latency increased", "Observability", "p95 crossed 250 ms"],
      ["Incident INC-82 resolved", "Incident tracker", "Retry limits adjusted"],
    ].map(([title, source, description], i) => ({
      id: "event-" + i,
      title,
      source,
      description,
      time: time(i * 0.2 + 0.1),
    })),
    services: [
      {
        id: "Checkout",
        name: "Checkout",
        status: "degraded",
        detail: "p95 above baseline",
      },
      { id: "Billing", name: "Billing", status: "healthy" },
      { id: "Identity", name: "Identity", status: "healthy" },
      {
        id: "Analytics",
        name: "Analytics",
        status: "unknown",
        detail: "No recent observation",
      },
    ],
    sources: [
      { id: "work", name: "Workspace", status: "ready", observedAt: time(0) },
      {
        id: "observability",
        name: "Observability",
        status: "ready",
        observedAt: time(0.05),
      },
      {
        id: "deployments",
        name: "Deployments",
        status: "ready",
        observedAt: time(0.3),
      },
    ],
    sections: [
      {
        id: "attention",
        title: "Two things need your attention.",
        body: "Checkout latency increased after the latest deployment. Review the deployment change and compare the error window.",
      },
      {
        id: "release",
        title: "The release is on track.",
        body: "Two checks remain before the cutoff: load testing and API approval. Owners have been assigned.",
      },
    ],
    progress: {
      title: "Release checks",
      current: 12,
      target: 14,
      checks: [
        { id: "integration", label: "Integration suite", done: true },
        { id: "load", label: "Load test", done: false },
        { id: "approval", label: "API approval", done: false },
      ],
    },
    events: Array.from({ length: 24 }, (_, i) => ({
      id: "log-" + i,
      timestamp: time(i / 120),
      service: i % 3 ? "Checkout" : "Billing",
      level: i % 5 === 0 ? "error" : i % 3 === 0 ? "warn" : "info",
      message: [
        "Payment gateway timed out after 3,000 ms",
        "Request completed successfully",
        "Retry budget approaching threshold",
        "Invoice batch completed: 248 records",
      ][i % 4],
      traceId: "trace-" + (i % 5),
    })),
  };
  if (["work", "flow"].includes(kind)) {
    data.mode = "records";
    data.metrics = [
      { label: "To do", value: 2 },
      { label: "In progress", value: 2 },
      { label: "Done", value: 2 },
      { label: "Completion", value: "33%" },
    ];
  }
  if (kind === "reviews") {
    data.items = Array.from({ length: 14 }, (_, i) => ({
      id: "#" + (284 - i),
      title: [
        "Add dashboard runtime",
        "Retry failed dataset queries",
        "Simplify task navigation",
        "Update dataset schema",
      ][i % 4],
      status:
        i % 4 === 1
          ? "Checks failing"
          : i % 3 === 0
            ? "Changes requested"
            : "Ready for review",
      assignee: ["Maya", "Luca", "Aisha"][i % 3],
      project: ["Frontend", "Runtime", "SDK"][i % 3],
    }));
    data.metrics = [
      { label: "Awaiting review", value: 14 },
      { label: "Assigned to you", value: 3 },
      { label: "Checks failing", value: 4 },
      { label: "Median wait", value: "4.2 h" },
    ];
  }
  if (kind === "release")
    data.metrics = [
      { label: "Readiness", value: "86%" },
      { label: "Open blockers", value: 2 },
      { label: "PRs merged", value: 34 },
      { label: "Target", value: "7 days" },
    ];
  if (kind === "cost") {
    data.categoryUnit = "$";
    data.categories = [
      { id: "compute", label: "Compute", value: 11780 },
      { id: "database", label: "Database", value: 4052 },
      { id: "storage", label: "Storage", value: 1658 },
      { id: "network", label: "Network", value: 930 },
    ];
    data.items = data.categories.map((c) => ({
      id: c.id,
      title: c.label,
      status: "Tracked",
      project: "Production",
      assignee: "Platform",
      count: c.value,
    }));
    data.metrics = [
      { label: "Spend to date", value: "$18,420" },
      { label: "Forecast", value: "$28,910" },
      { label: "Compute share", value: "64%" },
      { label: "Savings opportunity", value: "$2,140" },
    ];
    data.trendUnit = "$";
    data.trends = data.trends?.slice(0, 1).map((s) => ({
      ...s,
      id: "spend",
      label: "Daily spend",
      points: s.points.map((p) => ({ ...p, value: (p.value || 0) * 3 })),
    }));
    data.annotations = [];
    data.progress = {
      title: "Monthly budget",
      current: 18420,
      target: 30000,
      unit: "USD",
    };
  }
  if (kind === "customers") {
    data.items = [
      ["Northstar", "At risk", "28 / 80 seats"],
      ["Acme Labs", "Healthy", "142 / 160 seats"],
      ["Orbit Studio", "Watch", "38 / 60 seats"],
    ].map(([title, status, project], i) => ({
      id: "account-" + i,
      title,
      status,
      project,
      assignee: ["Maya", "Sam", "Aisha"][i],
    }));
    data.metrics = [
      { label: "Healthy", value: 142 },
      { label: "At risk", value: 12 },
      { label: "Active seats", value: 3842 },
      { label: "Renewing soon", value: 8 },
    ];
  }
  if (kind === "analytics") {
    data.metrics = [
      { label: "Active users", value: 24891 },
      { label: "Activation", value: "68.2%" },
      { label: "Week 4 retention", value: "42.7%" },
      { label: "Events / user", value: 18.4 },
    ];
    data.trendUnit = "users";
    data.trends = data.trends?.slice(0, 1).map((s) => ({
      ...s,
      id: "active",
      label: "Active users",
      points: s.points.map((p) => ({ ...p, value: (p.value || 0) * 80 })),
    }));
    data.annotations = [];
  }
  return data;
}
