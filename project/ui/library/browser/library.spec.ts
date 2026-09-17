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
  await page.mouse.up();
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
    page.getByRole("heading", { name: "Service health", exact: true, level: 1 }),
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
