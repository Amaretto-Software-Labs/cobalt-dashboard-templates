/** @param {import("@cobalt-code/dashboard/datasets").DatasetInput} input
 * @param {import("@cobalt-code/dashboard/datasets").DatasetContext} ctx */
async function main(input, ctx) {
  // Bind and probe the requested sources before returning configured: true.
  // Return the DashboardData contract documented in ui/README.md.
  return { configured: false };
}
