import { test, expect } from "@playwright/test";
test("pointer drop, undo and keyboard movement retain a working React tree", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#dashboard/work");
  const card = "Review billing migration";
  const handle = page.getByRole("button", {
    name: `Move ${card}`,
    exact: true,
  });
  const target = page.getByRole("region", { name: "Done", exact: true });
  const source = await handle.boundingBox();
  const destination = await target.boundingBox();
  expect(source).not.toBeNull();
  expect(destination).not.toBeNull();
  await page.mouse.move(
    source!.x + source!.width / 2,
    source!.y + source!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    destination!.x + destination!.width / 2,
    destination!.y + 85,
    { steps: 25 },
  );
  await expect(target).toHaveClass(/drop-target/);
  const slot = target.locator("[data-dnd-placeholder]");
  await expect(slot).toBeVisible();
  await expect(slot).toHaveCSS("border-top-style", "dashed");
  const projectedOrder = await target
    .locator(".work-card:not([data-dnd-dragging])")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-card-id")),
    );
  await page.mouse.up();
  await expect(page.locator(".drop-target")).toHaveCount(0);
  await expect(page.locator("[data-dnd-placeholder]")).toHaveCount(0);
  await expect
    .poll(() =>
      target
        .locator(".work-card")
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("data-card-id")),
        ),
    )
    .toEqual(projectedOrder);
  await expect(
    target.getByRole("button", { name: card, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "To do", exact: true })
      .getByRole("button", { name: card, exact: true }),
  ).toBeVisible();
  await handle.press("Space");
  await handle.press("ArrowRight");
  const keyboardLane = page.getByRole("region", {
    name: "In progress",
    exact: true,
  });
  await expect(keyboardLane).toHaveClass(/drop-target/);
  await expect(keyboardLane.locator("[data-dnd-placeholder]")).toBeVisible();
  await handle.press("Space");
  await expect(
    page
      .getByRole("region", { name: "In progress", exact: true })
      .getByRole("button", { name: card, exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("catalog filters and detail navigation use real controls", async ({
  page,
}) => {
  await page.goto("/#dashboards");
  await page
    .getByRole("textbox", { name: "Search the library…" })
    .fill("service health");
  await expect(
    page.getByRole("status").filter({ hasText: "1 results" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Preview Service health", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Service health",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboards" }).click();
  await expect(
    page.getByRole("textbox", { name: "Search the library…" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Base controls 6" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "6 results" }),
  ).toBeVisible();
});

test("review cards expose scope, filter rows and open oldest PR with pointer and keyboard", async ({
  page,
}, testInfo) => {
  await page.goto("/#dashboard/reviews");
  await page.getByRole("combobox", { name: "Review scope" }).click();
  await page
    .getByRole("option", { name: "Awaiting my review", exact: true })
    .click();
  const awaiting = page.getByRole("button", {
    name: "Awaiting your review: Show awaiting your review",
    exact: true,
  });
  await awaiting.click();
  await expect(
    page.getByRole("status").filter({ hasText: "5 matching records" }),
  ).toBeVisible();
  await expect(awaiting).toHaveAttribute("aria-pressed", "true");
  await awaiting.press("Space");
  await expect(awaiting).toHaveAttribute("aria-pressed", "false");
  const blocked = page.getByRole("button", {
    name: "Blocked: Show blocked",
    exact: true,
  });
  await blocked.focus();
  await blocked.press("Enter");
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(6);
  await page.screenshot({
    path: testInfo.outputPath("review-metrics.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Clear metric filter" }).click();
  const oldest = page.getByRole("button", {
    name: "Oldest PR: Open oldest pull request",
  });
  await oldest.click();
  await expect(page.getByRole("dialog")).toContainText("#284");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(oldest).toBeFocused();
  await page.getByRole("button", { name: "Light mode" }).click();
  await oldest.click();
  await expect(page.getByRole("dialog")).toContainText("#284");
  await page.keyboard.press("Escape");
  await expect(oldest).toBeFocused();
});

test("metric cards retain tooltip, focus and reduced-motion treatment on narrow screens", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto("/#dashboard/service");
  const metric = page.getByRole("button", {
    name: "Availability: Inspect observation and source",
  });
  await metric.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Inspect observation and source",
  );
  await expect(metric).toHaveCSS("transform", "none");
  await metric.focus();
  await metric.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Availability" }),
  ).toContainText("Illustrative library data");
  await page.keyboard.press("Escape");
});

test("kanban highlights the projected position over cards and clears it on cancel", async ({
  page,
}, testInfo) => {
  await page.goto("/#dashboard/work");
  const lane = page.getByRole("region", { name: "To do", exact: true });
  const handle = page.getByRole("button", {
    name: "Move Add release health checks",
    exact: true,
  });
  const source = await handle.boundingBox();
  const destination = await lane
    .locator('[data-card-id="CB-151"]')
    .boundingBox();
  await page.mouse.move(
    source!.x + source!.width / 2,
    source!.y + source!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    destination!.x + destination!.width / 2,
    destination!.y + 25,
    { steps: 25 },
  );
  await expect(lane).toHaveClass(/drop-target/);
  const slot = lane.locator("[data-dnd-placeholder]");
  await expect(slot).toBeVisible();
  await expect(slot).toHaveCSS("border-top-style", "dashed");
  await expect(slot).toHaveAttribute("data-card-id", "CB-146");
  await page.screenshot({
    path: testInfo.outputPath("kanban-drop-position.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".drop-target")).toHaveCount(0);
  await expect(page.locator("[data-dnd-placeholder]")).toHaveCount(0);
  await expect(lane.locator("[data-card-id]").first()).toHaveAttribute(
    "data-card-id",
    "CB-151",
  );
  await expect(lane.locator("[data-card-id]").last()).toHaveAttribute(
    "data-card-id",
    "CB-146",
  );
});

test("kanban shows a drop slot in an empty lane", async ({
  page,
}, testInfo) => {
  await page.goto("/#dashboard/work");
  for (const title of ["Resolve retry storm", "Update onboarding flow"]) {
    await page.getByRole("button", { name: title, exact: true }).click();
    await page.getByRole("combobox", { name: "Card status" }).click();
    await page.getByRole("option", { name: "To do", exact: true }).click();
    await page.getByRole("button", { name: "Save card", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  const lane = page.getByRole("region", { name: "Done", exact: true });
  await expect(lane.getByText("Drop a card here")).toBeVisible();
  const handle = page.getByRole("button", {
    name: "Move Review billing migration",
    exact: true,
  });
  await handle.scrollIntoViewIfNeeded();
  const from = await handle.boundingBox();
  const to = await lane.boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + 100, { steps: 25 });
  await page.screenshot({
    path: testInfo.outputPath("empty-lane.png"),
    fullPage: true,
  });
  await expect(lane).toHaveClass(/drop-target/);
  await expect(lane.locator("[data-dnd-placeholder]")).toBeVisible();
  await page.mouse.up();
  await expect(
    lane.getByRole("button", { name: "Review billing migration", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".drop-target")).toHaveCount(0);
});

test("kanban collapsed lanes are narrow, keyboard accessible and expand for a drop", async ({
  page,
}, testInfo) => {
  await page.goto("/#dashboard/work");
  const lane = page.getByRole("region", { name: "Done", exact: true });
  await expect(lane.getByRole("combobox")).toHaveCount(0);
  await page.getByRole("button", { name: "Collapse Done lane" }).click();
  await expect(lane).toHaveCSS("width", "44px");
  await expect(
    lane.getByRole("button", { name: "Resolve retry storm", exact: true }),
  ).toHaveCount(0);
  const expand = page.getByRole("button", { name: "Expand Done lane" });
  await expect(expand).toContainText("2");
  await expand.focus();
  await expand.press("Enter");
  await expect(
    lane.getByRole("button", { name: "Resolve retry storm", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Collapse Done lane" }).click();
  await page.screenshot({
    path: testInfo.outputPath("collapsed-lane.png"),
    fullPage: true,
  });
  const handle = page.getByRole("button", {
    name: "Move Review billing migration",
    exact: true,
  });
  const from = await handle.boundingBox();
  const to = await lane.boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + 90, { steps: 25 });
  await expect(
    page.getByRole("button", { name: "Collapse Done lane" }),
  ).toBeVisible();
  await expect(lane).toHaveClass(/drop-target/);
  await expect(lane.locator("[data-dnd-placeholder]")).toBeVisible();
  await page.mouse.up();
  await expect(
    lane.getByRole("button", { name: "Review billing migration", exact: true }),
  ).toBeVisible();
});

test("failed board drag restores the original lane and leaves undo disabled", async ({
  page,
}) => {
  await page.goto("/#component/board");
  await page.getByRole("switch", { name: "Simulate a failed write" }).click();
  const handle = page.getByRole("button", {
    name: "Move Review billing migration",
    exact: true,
  });
  await handle.press("Space");
  await handle.press("ArrowRight");
  const destination = page.getByRole("region", {
    name: "In progress",
    exact: true,
  });
  await expect(destination.locator("[data-dnd-placeholder]")).toBeVisible();
  await handle.press("Space");
  await expect(page.getByRole("alert")).toContainText(
    "Sample version conflict",
  );
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await expect(
    page
      .getByRole("region", { name: "To do", exact: true })
      .getByRole("button", { name: "Review billing migration", exact: true }),
  ).toBeVisible();
});

test("release timeline explores dependencies and checks update the sample progress", async ({
  page,
}, testInfo) => {
  await page.goto("/#dashboard/release");
  const milestone = page.getByRole("button", {
    name: "Inspect Release checks",
  });
  await milestone.hover();
  await expect(page.getByRole("tooltip")).toContainText("Aisha");
  await milestone.focus();
  await milestone.press("Enter");
  const inspector = page.getByRole("region", { name: "Selected milestone" });
  await expect(inspector).toContainText("This milestone is blocked.");
  await inspector
    .getByRole("button", { name: "Dashboard UI", exact: true })
    .click();
  await expect(
    inspector.getByRole("heading", { name: "Dashboard UI", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inspect API & schema" }),
  ).toHaveAttribute("aria-pressed", "false");
  await inspector
    .getByRole("button", { name: "Open milestone details" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Dashboard UI" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Timeline zoom" }).click();
  await page.getByRole("option", { name: "Detailed", exact: true }).click();
  await expect(page.locator(".timeline-scroll > div")).toHaveCSS(
    "min-width",
    "1000px",
  );
  await page.getByRole("combobox", { name: "Timeline zoom" }).click();
  await page.getByRole("option", { name: "Fit schedule", exact: true }).click();
  await page.getByRole("combobox", { name: "Check status" }).click();
  await page.getByRole("option", { name: "Pending (2)", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Inspect Integration suite" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Inspect Load test" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/peak traffic/)).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Mark Load test as passed" })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect Load test" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("progressbar", { name: "Release checks" }),
  ).toHaveAttribute("aria-valuenow", /^66/);
  await expect(
    page.getByRole("button", { name: "Inspect API approval" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Readiness: Inspect observation and source",
    }),
  ).toContainText("67%");
  await page.screenshot({
    path: testInfo.outputPath("release-interactions.png"),
    fullPage: true,
  });
});

test("release checks expand independently with keyboard controls and no popup", async ({
  page,
}, testInfo) => {
  await page.goto("/#component/progress");
  const load = page.getByRole("button", { name: "Inspect Load test" });
  await load.focus();
  await load.press("Enter");
  await expect(load).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/peak traffic/)).toBeVisible();
  const approval = page.getByRole("button", { name: "Inspect API approval" });
  await approval.focus();
  await approval.press("Space");
  await expect(approval).toHaveAttribute("aria-expanded", "true");
  await expect(load).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Mark Load test as passed" })
    .click();
  await expect(load).toContainText("Passed");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    /^66/,
  );
  await page.screenshot({
    path: testInfo.outputPath("inline-release-checks.png"),
    fullPage: true,
  });
  await load.click();
  await expect(load).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText(/peak traffic/)).not.toBeVisible();
});

test("timeline reschedules, resizes, cancels, edits and undoes changes", async ({
  page,
}, testInfo) => {
  await page.goto("/#component/timeline");
  const bar = page.getByRole("button", {
    name: "Inspect Dashboard UI",
    exact: true,
  });
  await bar.click();
  const start = page.getByRole("textbox", {
    name: "Start date (YYYY-MM-DD)",
    exact: true,
  });
  const end = page.getByRole("textbox", {
    name: "End date (YYYY-MM-DD)",
    exact: true,
  });
  const originalStart = await start.inputValue();
  const originalEnd = await end.inputValue();
  const track = await bar.locator("xpath=../..").boundingBox();
  const box = await bar.boundingBox();
  if (!track || !box) throw new Error("Missing timeline geometry");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + track.width / 8,
    box.y + box.height / 2,
    { steps: 15 },
  );
  await expect(page.getByText(/Release to save/)).toBeVisible();
  await page.mouse.up();
  await expect(start).not.toHaveValue(originalStart);
  await page.getByRole("button", { name: "Undo schedule change" }).click();
  await expect(start).toHaveValue(originalStart);
  await expect(end).toHaveValue(originalEnd);

  const grip = page.getByRole("button", { name: "Resize end of Dashboard UI" });
  const gripBox = await grip.boundingBox();
  if (!gripBox) throw new Error("Missing resize grip");
  await page.mouse.move(
    gripBox.x + gripBox.width / 2,
    gripBox.y + gripBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    gripBox.x + track.width / 8,
    gripBox.y + gripBox.height / 2,
    { steps: 15 },
  );
  await page.mouse.up();
  await expect(end).not.toHaveValue(originalEnd);
  await expect(start).toHaveValue(originalStart);
  await page.getByRole("button", { name: "Undo schedule change" }).click();
  await expect(end).toHaveValue(originalEnd);

  const restored = await bar.boundingBox();
  if (!restored) throw new Error("Missing bar");
  await page.mouse.move(
    restored.x + restored.width / 2,
    restored.y + restored.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    restored.x + restored.width / 2 + track.width / 8,
    restored.y + restored.height / 2,
    { steps: 15 },
  );
  await expect(page.getByText(/Release to save/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(start).toHaveValue(originalStart);
  await bar.press("ArrowRight");
  await expect(start).not.toHaveValue(originalStart);
  await page.getByRole("button", { name: "Undo schedule change" }).click();
  await expect(start).toHaveValue(originalStart);
  await page.getByRole("textbox", { name: "Milestone owner" }).fill("Sam");
  await page.getByRole("checkbox", { name: "Milestone blocked" }).click();
  await page.getByRole("button", { name: "Save milestone" }).click();
  await expect(bar).toContainText("Sam");
  await expect(
    page.getByRole("region", { name: "Selected milestone" }),
  ).toContainText("This milestone is blocked.");
  await page.screenshot({
    path: testInfo.outputPath("editable-timeline.png"),
    fullPage: true,
  });
});
