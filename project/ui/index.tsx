import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { RefreshCw, Search, AlertCircle, Inbox } from "lucide-react";
export function Button({
  primary,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`cobalt-button ${primary ? "cobalt-button--primary" : ""} ${className}`}
    />
  );
}
export function Card({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return <section className={`cobalt-card ${className}`}>{children}</section>;
}
export function Dashboard({
  title,
  description,
  children,
  actions,
}: PropsWithChildren<{
  title: string;
  description: string;
  actions?: ReactNode;
}>) {
  return (
    <main className="dashboard">
      {window.cobaltDashboardDemo && (
        <div role="status" className="preview-banner">
          Sample preview · Changes here do not affect live data
        </div>
      )}
      <header className="dashboard-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="toolbar">{actions}</div>
      </header>
      {children}
    </main>
  );
}
export function Refresh({
  loading,
  onClick,
}: {
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} disabled={loading}>
      <RefreshCw size={15} className={loading ? "spin" : ""} />
      Refresh
    </Button>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function State({
  loading,
  error,
  configured,
  retry,
}: {
  loading: boolean;
  error?: string;
  configured?: boolean;
  retry: () => void;
}) {
  if (error)
    return (
      <div role="alert" className="empty-state">
        <AlertCircle />
        <h2>Couldn’t load this view</h2>
        <p>{error}</p>
        <Button onClick={retry}>Try again</Button>
      </div>
    );
  if (loading)
    return (
      <div role="status" className="empty-state">
        Loading your dashboard…
      </div>
    );
  if (!configured)
    return (
      <div className="empty-state">
        <Inbox />
        <h2>Choose what this dashboard shows</h2>
        <p>
          Ask Cobalt to connect the data sources, scope and actions you need.
          This template is ready to customize.
        </p>
      </div>
    );
  return null;
}
export function Metric({
  label,
  value,
  change,
}: {
  label: string;
  value: ReactNode;
  change?: string;
}) {
  return (
    <Card className="metric">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {change && <span className="muted">{change}</span>}
    </Card>
  );
}
export function Badge({ children }: PropsWithChildren) {
  return <span className="badge">{children}</span>;
}

export { DataTable, TimeSeries, LogStream } from "./DataViews";
