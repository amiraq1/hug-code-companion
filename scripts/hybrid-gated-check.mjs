#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const NON_CRITICAL_BROWSER_PATTERNS = [
  /getPageVisitors/i,
  /recordPageExit/i,
  /getAIConnectorAuthorizationUrl/i,
  /Amplitude Logger/i,
  /Attestation check for Attribution Reporting/i,
  /Cross-Origin-Opener-Policy/i,
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function asBool(value, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

function makeDashedUuid(hex32) {
  const clean = hex32.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(clean)) {
    return null;
  }
  return [
    clean.slice(0, 8),
    clean.slice(8, 12),
    clean.slice(12, 16),
    clean.slice(16, 20),
    clean.slice(20),
  ].join("-");
}

function normalizeNotionPageId(input) {
  if (!input) {
    return null;
  }
  const raw = String(input).trim();
  const direct = makeDashedUuid(raw);
  if (direct) {
    return direct;
  }
  try {
    const url = new URL(raw);
    const pathname = url.pathname.replace(/\/$/, "");
    const lastSegment = pathname.split("/").pop() || "";
    const segmentWithoutQuery = lastSegment.split("?")[0];
    const maybeId = segmentWithoutQuery.includes("-")
      ? segmentWithoutQuery.split("-").pop()
      : segmentWithoutQuery;
    return makeDashedUuid(maybeId);
  } catch {
    return null;
  }
}

function firstRichTextAsPlainText(richText) {
  if (!Array.isArray(richText)) {
    return null;
  }
  return richText.map((item) => item?.plain_text || "").join("") || null;
}

function extractPageTitle(pageObject) {
  const properties = pageObject?.properties;
  if (!properties || typeof properties !== "object") {
    return null;
  }
  for (const [, prop] of Object.entries(properties)) {
    if (prop?.type === "title") {
      return firstRichTextAsPlainText(prop.title);
    }
  }
  return null;
}

function extractStatus(properties) {
  if (!properties || typeof properties !== "object") {
    return null;
  }
  for (const [name, prop] of Object.entries(properties)) {
    if (prop?.type === "status") {
      return { property: name, value: prop.status?.name || null };
    }
  }
  return null;
}

function classifyBrowserIssue(message) {
  return NON_CRITICAL_BROWSER_PATTERNS.some((pattern) => pattern.test(message))
    ? "non_critical"
    : "critical";
}

async function runNotionApiCheck(config) {
  const result = {
    attempted: false,
    status: "skip",
    success: false,
    criticalErrors: [],
    warnings: [],
    details: {},
  };

  if (config.skipApi) {
    result.status = "skip";
    result.warnings.push("API phase was skipped by configuration.");
    return result;
  }

  result.attempted = true;

  if (!config.notionApiKey) {
    result.status = "fail";
    result.criticalErrors.push("NOTION_API_KEY is not set.");
    return result;
  }

  if (!config.pageId) {
    result.status = "fail";
    result.criticalErrors.push("No Notion page ID could be resolved.");
    return result;
  }

  const endpoint = `https://api.notion.com/v1/pages/${config.pageId}`;
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.notionApiKey}`,
        "Notion-Version": config.notionVersion,
      },
    });

    const bodyText = await response.text();
    let payload = null;
    try {
      payload = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      result.status = "fail";
      result.criticalErrors.push(
        `Notion API returned ${response.status} ${response.statusText}.`
      );
      if (payload?.message) {
        result.details.apiErrorMessage = payload.message;
      }
      return result;
    }

    const title = extractPageTitle(payload);
    const status = extractStatus(payload?.properties);

    result.status = "pass";
    result.success = true;
    result.details = {
      object: payload?.object || null,
      pageId: payload?.id || config.pageId,
      title,
      pageUrl: payload?.url || config.pageUrl || null,
      status,
      lastEditedTime: payload?.last_edited_time || null,
    };
    return result;
  } catch (error) {
    result.status = "fail";
    result.criticalErrors.push(
      `Notion API request failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return result;
  }
}

async function runBrowserFetchCheck(url) {
  const result = {
    attempted: true,
    status: "pass",
    success: true,
    criticalErrors: [],
    nonCriticalErrors: [],
    warnings: [],
    details: {
      mode: "fetch",
      pageUrl: url,
    },
  };

  if (!url) {
    result.attempted = false;
    result.status = "skip";
    result.success = false;
    result.warnings.push("No browser URL provided.");
    return result;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "hybrid-gated-check/1.0",
      },
    });

    const html = await response.text();
    result.details.httpStatus = response.status;
    result.details.finalUrl = response.url;
    result.details.pageTitle = (html.match(/<title>(.*?)<\/title>/i) || [])[1] || null;

    const lower = html.toLowerCase();
    const authWall =
      lower.includes("sign in") ||
      lower.includes("log in") ||
      lower.includes("continue with google") ||
      lower.includes("تسجيل الدخول") ||
      lower.includes("المتابعة باستخدام");

    if (authWall) {
      result.warnings.push("Browser phase reached an auth wall; UI content may be limited.");
    }

    if (response.status >= 500) {
      result.status = "fail";
      result.success = false;
      result.criticalErrors.push(`Browser fetch returned ${response.status}.`);
      return result;
    }

    if (response.status >= 400) {
      result.status = "warn";
      result.success = true;
      result.nonCriticalErrors.push(`Browser fetch returned ${response.status}.`);
      return result;
    }

    if (authWall) {
      result.status = "warn";
    }
    return result;
  } catch (error) {
    result.status = "fail";
    result.success = false;
    result.criticalErrors.push(
      `Browser fetch failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return result;
  }
}

async function runBrowserPlaywrightCheck(url) {
  const result = {
    attempted: true,
    status: "pass",
    success: true,
    criticalErrors: [],
    nonCriticalErrors: [],
    warnings: [],
    details: {
      mode: "playwright",
      pageUrl: url,
      console: {
        errors: [],
        warnings: [],
      },
    },
  };

  if (!url) {
    result.attempted = false;
    result.status = "skip";
    result.success = false;
    result.warnings.push("No browser URL provided.");
    return result;
  }

  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    result.status = "skip";
    result.success = false;
    result.warnings.push(
      "Playwright is not installed. Run `npm i -D playwright` or switch to --browser-mode fetch."
    );
    return result;
  }

  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        result.details.console.errors.push(msg.text());
      }
      if (msg.type() === "warning") {
        result.details.console.warnings.push(msg.text());
      }
    });

    const response = await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    result.details.finalUrl = page.url();
    result.details.pageTitle = await page.title();
    result.details.httpStatus = response?.status() ?? null;

    for (const errorText of result.details.console.errors) {
      const severity = classifyBrowserIssue(errorText);
      if (severity === "critical") {
        result.criticalErrors.push(errorText);
      } else {
        result.nonCriticalErrors.push(errorText);
      }
    }

    if (result.criticalErrors.length > 0) {
      result.status = "fail";
      result.success = false;
    } else if (result.nonCriticalErrors.length > 0 || result.details.console.warnings.length > 0) {
      result.status = "warn";
    }
    return result;
  } catch (error) {
    result.status = "fail";
    result.success = false;
    result.criticalErrors.push(
      `Playwright phase failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return result;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function runBrowserCheck(config) {
  if (config.browserMode === "none") {
    return {
      attempted: false,
      status: "skip",
      success: false,
      criticalErrors: [],
      nonCriticalErrors: [],
      warnings: ["Browser phase disabled by configuration."],
      details: { mode: "none", pageUrl: config.browserUrl || null },
    };
  }

  if (config.browserMode === "playwright") {
    return runBrowserPlaywrightCheck(config.browserUrl);
  }
  return runBrowserFetchCheck(config.browserUrl);
}

function computeFinalStatus(api, browser, browserRequired) {
  if (api.status === "fail") {
    return "FAIL";
  }

  if (browserRequired && browser.status === "fail") {
    return "FAIL";
  }

  if (browser.status === "fail" && !browserRequired) {
    return "WARN";
  }

  if (
    browser.status === "warn" ||
    browser.status === "skip" ||
    api.status === "skip"
  ) {
    return "WARN";
  }

  return "PASS";
}

async function writeOutput(report, outputPath) {
  if (!outputPath) {
    return;
  }
  const absolutePath = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(process.cwd(), outputPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const pageInput =
    args["page-id"] ||
    args["page-url"] ||
    args["page"] ||
    process.env.HYBRID_PAGE_ID ||
    process.env.HYBRID_PAGE_URL ||
    null;
  const pageId = normalizeNotionPageId(pageInput);
  const pageUrl =
    args["page-url"] ||
    process.env.HYBRID_PAGE_URL ||
    (pageId ? `https://www.notion.so/${pageId.replace(/-/g, "")}` : null);

  const config = {
    skipApi: asBool(args["skip-api"], asBool(process.env.HYBRID_SKIP_API, false)),
    browserMode:
      String(args["browser-mode"] || process.env.HYBRID_BROWSER_MODE || "fetch").toLowerCase(),
    browserRequired: asBool(
      args["browser-required"],
      asBool(process.env.HYBRID_BROWSER_REQUIRED, false)
    ),
    browserUrl: args["browser-url"] || process.env.HYBRID_BROWSER_URL || pageUrl,
    pageId,
    pageUrl,
    notionApiKey: args["notion-api-key"] || process.env.NOTION_API_KEY || null,
    notionVersion: args["notion-version"] || process.env.NOTION_VERSION || "2022-06-28",
    outputPath: args.out || process.env.HYBRID_CHECK_OUT || "artifacts/hybrid-gated-check.json",
  };

  const api = await runNotionApiCheck(config);
  const browser = await runBrowserCheck(config);

  const report = {
    policy: "hybrid-gated-v1",
    generatedAt: new Date().toISOString(),
    inputs: {
      pageInput,
      pageId: config.pageId,
      pageUrl: config.pageUrl,
      browserUrl: config.browserUrl,
      browserMode: config.browserMode,
      browserRequired: config.browserRequired,
      apiSkipped: config.skipApi,
    },
    phases: {
      api,
      browser,
    },
    classification: {
      critical_errors: [
        ...api.criticalErrors,
        ...(browser.criticalErrors || []),
      ],
      non_critical_errors: [...(browser.nonCriticalErrors || [])],
      warnings: [...api.warnings, ...(browser.warnings || [])],
    },
  };

  report.finalStatus = computeFinalStatus(api, browser, config.browserRequired);

  await writeOutput(report, config.outputPath);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.finalStatus === "FAIL") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const failReport = {
    policy: "hybrid-gated-v1",
    generatedAt: new Date().toISOString(),
    finalStatus: "FAIL",
    classification: {
      critical_errors: [
        `Unhandled failure: ${error instanceof Error ? error.message : String(error)}`,
      ],
      non_critical_errors: [],
      warnings: [],
    },
  };
  process.stdout.write(`${JSON.stringify(failReport, null, 2)}\n`);
  process.exitCode = 1;
});
