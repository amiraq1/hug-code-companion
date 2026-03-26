import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = resolve(import.meta.dirname, "..");
const configPath = resolve(rootDir, "supabase", "config.toml");
const configText = readFileSync(configPath, "utf8");
const projectRefMatch = configText.match(/^\s*project_id\s*=\s*"([^"]+)"/m);

if (!projectRefMatch) {
  console.error(`Could not find project_id in ${configPath}`);
  process.exit(1);
}

const projectRef = projectRefMatch[1];
const functionsToDeploy = ["github-auth", "github-api"];

console.log(`Deploying ${functionsToDeploy.join(", ")} to project ${projectRef}...`);

for (const functionName of functionsToDeploy) {
  const result = spawnSync(
    "supabase",
    ["functions", "deploy", functionName, "--project-ref", projectRef],
    {
      cwd: rootDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );

  if (result.status !== 0) {
    console.error(`Deployment failed for ${functionName}.`);
    if (!process.env.SUPABASE_ACCESS_TOKEN) {
      console.error("If the CLI is not logged in yet, run `supabase login` or set SUPABASE_ACCESS_TOKEN.");
    }
    process.exit(result.status ?? 1);
  }
}

console.log("GitHub edge functions deployed successfully.");
