import type { ChartRecord } from "../compositions/ChartExplorer";
// Deterministic illustrative observations. Never imported by published dashboards.
export function chartFixture(): ChartRecord[] {
  return ["Checkout", "Billing", "Identity", "Platform"].flatMap((group, g) =>
    Array.from({ length: 6 }, (_, i) => ({
      id: group + "-" + i,
      label: group + " · " + String(i * 4).padStart(2, "0") + ":00",
      group,
      time: new Date(Date.UTC(2026, 8, 19, i * 4)).toISOString(),
      value: 12 + g * 9 + i * 7 + (g === 0 && i === 4 ? 80 : 0),
      comparison: 10 + g * 8 + i * 5,
      size: 100 + (g + i) * 50,
      stage: (g + i) % 3,
    })),
  );
}
