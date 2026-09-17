#!/usr/bin/env node
import { DashboardDevelopment } from "./development.js";

const [command, operation, key, ...args] = process.argv.slice(2);
try {
  if (command !== "dataset" || operation !== "run" || !key ||
      args.length !== 0 && (args.length !== 2 || args[0] !== "--params"))
    throw new Error('Usage: cobalt-dashboard dataset run <key> [--params \'{"filter":"value"}\']');
  const parameters = args.length ? JSON.parse(args[1]) : {};
  if (!parameters || Array.isArray(parameters) || typeof parameters !== "object") throw new Error("Dataset parameters must be a JSON object.");
  const result = await new DashboardDevelopment(process.cwd()).run(key, parameters);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
} catch (error) {
  process.stderr.write(JSON.stringify({ code: (error as { code?: string }).code ?? "dataset_test_failed", message: (error as Error).message }) + "\n");
  process.exitCode = 1;
}
