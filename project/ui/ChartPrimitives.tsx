import type { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { Button } from "./Controls";

export const chartColors = [
  "var(--color-accent)",
  "var(--color-warning)",
  "var(--color-success)",
  "var(--color-info)",
];
export const chartTooltipStyle = {
  background: "var(--color-panel)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  color: "var(--color-text)",
};
export type ChartSelectionProps = {
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
};
export function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <div className="chart-frame">
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 600, height: 260 }}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
}
export function ChartSelection({
  options,
  selectedId,
  onSelect,
  showColors = true,
}: ChartSelectionProps & {
  showColors?: boolean;
  options: {
    id: string;
    label: string;
    value?: string | number;
    disabled?: boolean;
  }[];
}) {
  return (
    <div className="chart-selection">
      <div className="chart-options" aria-label="Chart selections">
        {options.map((option, i) => (
          <Button
            key={option.id}
            variant="quiet"
            disabled={!onSelect || option.disabled}
            aria-pressed={option.id === selectedId}
            onClick={() =>
              onSelect?.(option.id === selectedId ? undefined : option.id)
            }
          >
            {showColors && (
              <span
                className="color-dot"
                style={{ background: chartColors[i % chartColors.length] }}
              />
            )}
            {option.label}
            {option.value !== undefined && <b>{option.value}</b>}
          </Button>
        ))}
      </div>
      {selectedId !== undefined && onSelect && (
        <Button variant="quiet" onClick={() => onSelect(undefined)}>
          Clear chart selection
        </Button>
      )}
    </div>
  );
}
