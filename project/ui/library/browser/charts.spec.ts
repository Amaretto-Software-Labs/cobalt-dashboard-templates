import { expect, test } from "@playwright/test";
test.use({ reducedMotion: "reduce" });

test("grouped bars filter actual rows and totals with pointer and keyboard and reset", async ({
  page,
}) => {
  await page.goto("/#component/comparison");
  const primary = page.locator(".chart-explorer-primary");
  await primary.locator(".recharts-bar-rectangle").first().click();
  await expect(page.locator(".chart-scope")).toContainText("6 of 24");
  await expect(page.locator(".chart-explorer-linked .metric")).toContainText(
    "257",
  );
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(7);
  await primary.getByRole("button", { name: "Clear chart selection" }).click();
  await expect(page.locator(".chart-scope")).toContainText("24 of 24");
  await primary.getByRole("button", { name: "Billing", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".chart-scope")).toContainText("Billing · 6 of 24");
  await primary.getByRole("combobox", { name: "Bar layout" }).click();
  await page.getByRole("option", { name: "Stacked", exact: true }).click();
  await expect(page.locator(".chart-scope")).toContainText("Billing · 6 of 24");
  await primary.getByRole("button", { name: "Baseline", exact: true }).click();
  await expect(
    primary.getByRole("button", { name: "Baseline", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Clear all chart filters" }).click();
  await expect(page.locator(".chart-scope")).toContainText("24 of 24");
});

test("donut segments and scatter points filter contributing observations", async ({
  page,
}) => {
  await page.goto("/#component/donut");
  await page.locator(".recharts-pie-sector").first().click();
  await expect(page.locator(".chart-scope")).toContainText("6 of 24");
  await page.getByRole("button", { name: "Clear all chart filters" }).click();
  await page.goto("/#component/scatter");
  await page.locator(".recharts-scatter-symbol").first().click();
  await expect(page.locator(".chart-scope")).toContainText("1 of 24");
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
  await page
    .getByRole("table")
    .getByRole("button", { name: /^Open / })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Baseline");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Clear all chart filters" }).click();
  await expect(page.locator(".chart-scope")).toContainText("24 of 24");
});

test("treemap drills into groups, filters leaves and navigates back", async ({
  page,
}) => {
  await page.goto("/#component/treemap");
  await page
    .getByRole("button", { name: "Explore Checkout", exact: true })
    .click();
  const leaf = page.getByRole("button", {
    name: "Explore Checkout · 16:00",
    exact: true,
  });
  await leaf.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".chart-scope")).toContainText("1 of 24");
  await expect(page.getByRole("table")).toContainText("120 units");
  await page
    .getByRole("navigation", { name: "Chart hierarchy" })
    .getByRole("button", { name: "All groups" })
    .click();
  await expect(
    page.getByRole("button", { name: "Explore Billing", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".chart-scope")).toContainText("24 of 24");
});

test("time brush updates linked rows and area layout retains range until reset", async ({
  page,
}) => {
  await page.goto("/#component/area");
  const start = page.getByRole("slider").first();
  await start.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".chart-scope")).toContainText("20 of 24");
  await page.getByRole("combobox", { name: "Area layout" }).click();
  await page.getByRole("option", { name: "Stacked", exact: true }).click();
  await expect(page.locator(".chart-scope")).toContainText("20 of 24");
  await page.getByRole("button", { name: "Reset time range" }).click();
  await expect(page.locator(".chart-scope")).toContainText("24 of 24");
  const handle = await page.getByRole("slider").first().boundingBox();
  const end = await page.getByRole("slider").last().boundingBox();
  if (!handle || !end) throw Error("Brush not rendered");
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle.x + (end.x - handle.x) * 0.45,
    handle.y + handle.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect(page.locator(".chart-scope")).not.toContainText("24 of 24");
  await page.getByRole("button", { name: "Clear all chart filters" }).click();
  await expect(page.locator(".chart-scope")).toContainText("24 of 24");
});

test("histogram, heatmap and funnel selections filter records", async ({
  page,
}) => {
  await page.goto("/#component/distribution");
  await page
    .locator(".chart-explorer-primary .chart-options button")
    .last()
    .click();
  await expect(page.locator(".chart-scope")).toContainText("1 of 24");
  await page.goto("/#component/heatmap");
  await page.locator(".heat-cell").first().press("Enter");
  await expect(page.locator(".chart-scope")).toContainText("1 of 24");
  await page.goto("/#component/funnel");
  await page.getByRole("button", { name: /Resolved.*8/ }).click();
  await expect(page.locator(".chart-scope")).toContainText("8 of 24");
});

test("charts respect theme and fit narrow screens with reduced motion", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 560, height: 900 });
  await page.goto("/#component/donut");
  await page.getByRole("button", { name: "Light mode" }).click();
  await page
    .locator(".chart-explorer-primary .chart-options button")
    .first()
    .click();
  await expect(page.locator(".chart-scope")).toContainText("6 of 24");
  const overflow = await page
    .locator(".chart-explorer")
    .evaluate((n) => n.scrollWidth > n.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("charts-mobile-light.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.getByRole("button", { name: "Dark mode" }).click();
  await page.screenshot({
    path: testInfo.outputPath("charts-desktop-dark.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("hover and keyboard focus follow chart marks without bounding boxes", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#component/funnel");
  const stage = page.locator(".funnel-step").first();
  await stage.hover();
  await expect(stage).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -2)");
  await stage.click();
  await expect(stage).toHaveCSS("box-shadow", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(stage).toHaveCSS("transition-duration", "0s");

  await page.goto("/#component/comparison");
  const bar = page.locator(".recharts-bar-rectangle").first();
  await bar.hover();
  await expect(page.locator(".recharts-tooltip-wrapper")).toBeVisible();
  await expect(page.locator(".recharts-tooltip-cursor")).toHaveCount(0);
  await bar.click();
  expect(
    await page
      .locator(".chart-frame [tabindex]")
      .evaluateAll(
        (nodes) =>
          nodes.filter((n) => getComputedStyle(n).outlineStyle !== "none")
            .length,
      ),
  ).toBe(0);
  await expect(
    page.locator(".chart-explorer-linked .breakdown-row[aria-pressed=true]"),
  ).toHaveCSS("box-shadow", "none");
  await page.locator(".chart-explorer-primary").screenshot({
    path: testInfo.outputPath("bar-hover.png"),
    animations: "disabled",
  });

  await page.goto("/#component/donut");
  const chart = page.locator(".recharts-surface");
  await chart.focus();
  await chart.press("ArrowRight");
  await expect(chart).toHaveCSS("outline-style", "none");
  await expect(page.locator(".recharts-tooltip-wrapper")).toBeVisible();
  expect(
    await page
      .locator(".chart-frame")
      .evaluate((el) => getComputedStyle(el, "::after").content),
  ).toContain("arrow keys");
  await page.locator(".chart-explorer-primary").screenshot({
    path: testInfo.outputPath("donut-keyboard.png"),
    animations: "disabled",
  });
  await page.locator(".recharts-pie-sector").first().click();
  const outlined = await page
    .locator(".chart-frame [tabindex]")
    .evaluateAll(
      (nodes) =>
        nodes.filter((n) => getComputedStyle(n).outlineStyle !== "none").length,
    );
  expect(outlined).toBe(0);
  // The alternative HTML controls still show a proper keyboard focus indicator.
  const option = page.locator(".chart-options button").first();
  await option.focus();
  await option.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(option).toHaveCSS("outline-style", "solid");
});
