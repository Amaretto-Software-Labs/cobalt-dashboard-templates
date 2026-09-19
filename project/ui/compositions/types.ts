import type { Item } from "@cobalt-code/dashboard";
import type { Series, Category, HistogramBin, HeatCell } from "../Charts";
import type {
  ProgressCheck,
  ActivityEvent,
  Milestone,
  NarrativeSection,
  StatusEntity,
} from "../SummaryViews";
import type { SourceStatus } from "../Layout";
import type { LogEvent } from "../DataViews";
export type DashboardData = {
  analysis?: {
    records: import("./ChartExplorer").ChartRecord[];
    measureLabel: string;
    comparisonLabel: string;
    unit: string;
  };
  configured: boolean;
  mode?: "records" | "connected";
  items?: Item[];
  columns?: string[];
  metrics?: {
    label: string;
    value: string | number | null;
    unit?: string;
    change?: string;
    trend?: number[];
    drilldown?: { label: string } & (
      | { itemIds: string[] }
      | { itemId: string }
      | { fields: Record<string, unknown> }
    );
  }[];
  trends?: Series[];
  trendUnit?: string;
  annotations?: { time: string; label: string }[];
  categories?: Category[];
  categoryUnit?: string;
  bins?: HistogramBin[];
  percentiles?: Record<string, number>;
  heatmap?: { rows: string[]; columns: string[]; cells: HeatCell[] };
  funnel?: Category[];
  milestones?: Milestone[];
  activities?: ActivityEvent[];
  services?: StatusEntity[];
  sources?: SourceStatus[];
  sections?: NarrativeSection[];
  progress?: {
    title: string;
    current: number | null;
    target: number;
    unit?: string;
    checks?: ProgressCheck[];
  };
  events?: LogEvent[];
  eventsDatasetKey?: string;
  updatedAt?: string;
  complete?: boolean;
  gap?: string;
};
