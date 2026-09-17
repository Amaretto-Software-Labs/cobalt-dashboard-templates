import type { Item } from "@cobalt-code/dashboard";
import type { Series, Category, HistogramBin, HeatCell } from "../Charts";
import type {
  ActivityEvent,
  Milestone,
  NarrativeSection,
  StatusEntity,
} from "../SummaryViews";
import type { SourceStatus } from "../Layout";
import type { LogEvent } from "../DataViews";
export type DashboardData = {
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
    checks?: { id: string; label: string; done: boolean }[];
  };
  events?: LogEvent[];
  eventsDatasetKey?: string;
  updatedAt?: string;
  complete?: boolean;
  gap?: string;
};
