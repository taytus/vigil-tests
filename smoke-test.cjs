const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL || "http://localhost:8000";
const LOGIN_EMAIL = process.env.LOGIN_EMAIL || "test@example.com";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "password123";
const PAGE_TIMEOUT = parseInt(process.env.PAGE_TIMEOUT || "10000", 10);

const ROUTES = [
  { uri: "/admin/api-costs", name: "admin.api-costs.index" },
  { uri: "/admin/api-costs/data", name: "admin.api-costs.data" },
  { uri: "/admin/dashboard", name: "admin.dashboard" },
  { uri: "/anniversaries", name: "anniversaries.index" },
  { uri: "/client-portal/activity", name: "client-portal.activity" },
  { uri: "/client-portal/dashboard", name: "client-portal.dashboard" },
  { uri: "/connections", name: "connections.index" },
  { uri: "/dashboard", name: "dashboard" },
  { uri: "/leads", name: "leads.index" },
  { uri: "/listings", name: "listings.index" },
  { uri: "/outreach", name: "outreach.index" },
  { uri: "/properties", name: "properties.index" },
  { uri: "/settings", name: "settings.index" },
  { uri: "/transactions", name: "transactions.index" },
  { uri: "/workflows", name: "workflows.index" },
];

const ERROR_PATTERNS = [
  /500\s*(Internal\s*)?Server\s*Error/i,
  /Whoops,?\s*looks?\s*like\s*something\s*went\s*wrong/i,
  /Server\s*Error/i,
  /SQLSTATE\[/i,
  /Class .+ not found/i,
  /Call to undefined/i,
];

async function run() {
  const startTime = Date.now();
  const results = [];
  console.log("=== VIGIL-UX Playwright Smoke Test ===");
  console.log("Target: " + BASE_URL);
  console.log("Routes to test: " + ROUTES.length);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  console.log("[LOGIN] Navigating to login page...");
  try {
    await page.goto(BASE_URL + "/login", { timeout: PAGE_TIMEOUT, waitUntil: "domcontentloaded" });
    await page.fill("input[name=\"email\"], input[type=\"email\"]", LOGIN_EMAIL);
    await page.fill("input[name=\"password\"], input[type=\"password\"]", LOGIN_PASSWORD);
    const submitButton = await page.$("button[type=\"submit\"], input[type=\"submit\"]");
    if (submitButton) await submitButton.click();
    else await page.press("input[name=\"password\"]", "Enter");
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: PAGE_TIMEOUT });
    console.log("[LOGIN] Success - redirected to " + page.url());
  } catch (err) {
    console.error("[LOGIN] FAILED: " + err.message);
    await browser.close();
    process.exit(1);
  }

  console.log("[TESTING] Starting route smoke tests...");

  for (let i = 0; i < ROUTES.length; i++) {
    const route = ROUTES[i];
    const url = BASE_URL + route.uri;
    const result = { uri: route.uri, name: route.name, status: null, passed: false, reason: null };
    const routeStart = Date.now();
    try {
      const response = await page.goto(url, { timeout: PAGE_TIMEOUT, waitUntil: "domcontentloaded" });
      result.status = response ? response.status() : null;
      const body = await page.content();
      for (const pattern of ERROR_PATTERNS) {
        if (pattern.test(body)) { result.passed = false; result.reason = "Error in page: " + pattern; break; }
      }
      if (!result.reason) result.passed = true;
    } catch (err) {
      result.passed = false;
      result.reason = err.message.substring(0, 120);
    }
    result.timeMs = Date.now() - routeStart;
    const icon = result.passed ? "PASS" : "FAIL";
    console.log(icon + " " + (result.status || "---") + " " + result.timeMs + "ms " + route.uri);
    results.push(result);
  }

  await browser.close();
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log("\nResults: " + passed + " passed, " + failed + " failed out of " + results.length + " routes");
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error("Fatal error:", err); process.exit(2); });

