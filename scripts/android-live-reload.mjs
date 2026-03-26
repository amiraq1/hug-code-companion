#!/usr/bin/env node

import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import fs from "node:fs";

const DEFAULT_PORT = Number(process.env.ANDROID_LIVE_PORT || 5173);
const DEFAULT_HOST = process.env.ANDROID_LIVE_HOST || "127.0.0.1";
const DEFAULT_BIND_HOST = process.env.ANDROID_VITE_BIND_HOST || "0.0.0.0";
const STARTUP_TIMEOUT_MS = 45_000;
const EXIT_AFTER_BOOT = ["1", "true", "yes"].includes(
  String(process.env.ANDROID_LIVE_EXIT_AFTER_BOOT || "").toLowerCase()
);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WINDOWS_DEFAULT_JAVA_HOME = "C:\\Program Files\\Android\\Android Studio\\jbr";
let activeVitePid = null;

function log(message) {
  process.stdout.write(`[android:live] ${message}\n`);
}

function fail(message) {
  process.stderr.write(`[android:live] ${message}\n`);
  process.exit(1);
}

function commandName(base) {
  return base;
}

function quoteCmdArg(arg) {
  const value = String(arg);
  if (!/[\s"]/u.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}

function resolveCommand(command, args) {
  if (process.platform !== "win32") {
    return {
      command,
      args,
      shell: false,
    };
  }

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", [command, ...args].map(quoteCmdArg).join(" ")],
    shell: false,
  };
}

function resolveRuntimeEnv() {
  const env = { ...process.env };

  if (!env.JAVA_HOME && process.platform === "win32" && fs.existsSync(WINDOWS_DEFAULT_JAVA_HOME)) {
    env.JAVA_HOME = WINDOWS_DEFAULT_JAVA_HOME;
  }

  if (!env.ANDROID_HOME && env.LOCALAPPDATA) {
    const sdkPath = path.join(env.LOCALAPPDATA, "Android", "Sdk");
    if (fs.existsSync(sdkPath)) {
      env.ANDROID_HOME = sdkPath;
    }
  }

  if (!env.ANDROID_SDK_ROOT && env.ANDROID_HOME) {
    env.ANDROID_SDK_ROOT = env.ANDROID_HOME;
  }

  if (!env.ENABLE_ABI_SPLITS) {
    env.ENABLE_ABI_SPLITS = "false";
  }

  return env;
}

function spawnCommand(command, args, options = {}) {
  const resolved = resolveCommand(command, args);
  const child = spawn(resolved.command, resolved.args, {
    cwd: rootDir,
    env: resolveRuntimeEnv(),
    stdio: ["ignore", "pipe", "pipe"],
    shell: resolved.shell,
    ...options,
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

function runCommandCapture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`));
    });
  });
}

function resolveAdbPath() {
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, "platform-tools", adbExecutableName()),
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, "platform-tools", adbExecutableName()),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", adbExecutableName()),
    process.platform === "darwin" ? path.join(os.homedir(), "Library", "Android", "sdk", "platform-tools", adbExecutableName()) : null,
    process.platform === "linux" ? path.join(os.homedir(), "Android", "Sdk", "platform-tools", adbExecutableName()) : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function adbExecutableName() {
  return process.platform === "win32" ? "adb.exe" : "adb";
}

function parseDevices(adbOutput) {
  return adbOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices attached"))
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts[1] === "device")
    .map((parts) => parts[0]);
}

async function getTargetDevice(adbPath) {
  const { stdout } = await runCommandCapture(adbPath, ["devices", "-l"]);
  const devices = parseDevices(stdout);

  if (devices.length === 0) {
    fail("No Android device is connected. Connect a phone or start an emulator first.");
  }

  if (process.env.ANDROID_TARGET) {
    if (!devices.includes(process.env.ANDROID_TARGET)) {
      fail(`ANDROID_TARGET=${process.env.ANDROID_TARGET} is not available.`);
    }
    return process.env.ANDROID_TARGET;
  }

  return devices[0];
}

function waitForPort(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const attempt = () => {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for http://${host}:${port}`));
          return;
        }
        setTimeout(attempt, 500);
      });
    };

    attempt();
  });
}

function killProcessTree(pid) {
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
    });
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    // Best-effort cleanup only.
  }
}

function cleanupActiveVite() {
  if (activeVitePid) {
    killProcessTree(activeVitePid);
    activeVitePid = null;
  }
}

async function main() {
  const adbPath = resolveAdbPath();
  if (!adbPath) {
    fail("adb was not found. Set ADB_PATH or install Android platform-tools.");
  }

  const target = await getTargetDevice(adbPath);
  const viteArgs = ["run", "dev", "--", "--host", DEFAULT_BIND_HOST, "--port", String(DEFAULT_PORT)];
  const viteChild = spawnCommand(commandName("npm"), viteArgs, {
    detached: process.platform !== "win32",
  });
  activeVitePid = viteChild.pid;

  let shuttingDown = false;
  const shutdown = (code = 0) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    cleanupActiveVite();
    process.exit(code);
  };

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
  viteChild.on("exit", (code) => {
    if (!shuttingDown && code && code !== 0) {
      fail(`Vite dev server exited early with code ${code}.`);
    }
  });

  log(`Using device ${target}`);
  log(`Starting Vite on http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
  await waitForPort(DEFAULT_HOST, DEFAULT_PORT, STARTUP_TIMEOUT_MS);

  const capArgs = [
    "cap",
    "run",
    "android",
    "--target",
    target,
    "--flavor",
    "dev",
    "--live-reload",
    "--host",
    DEFAULT_HOST,
    "--port",
    String(DEFAULT_PORT),
    "--forwardPorts",
    `${DEFAULT_PORT}:${DEFAULT_PORT}`,
  ];

  log("Launching Android app with live reload over USB");

  await new Promise((resolve, reject) => {
    const resolved = resolveCommand(commandName("npx"), capArgs);
    const child = spawn(resolved.command, resolved.args, {
      cwd: rootDir,
      env: resolveRuntimeEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: resolved.shell,
    });

    child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr?.on("data", (chunk) => process.stderr.write(chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`cap run exited with code ${code}`));
    });
  });

  if (EXIT_AFTER_BOOT) {
    log("Boot verification complete. Exiting because ANDROID_LIVE_EXIT_AFTER_BOOT is enabled.");
    shutdown(0);
    return;
  }

  log("Live reload is active. Leave this command running while you edit. Press Ctrl+C to stop.");
  await new Promise(() => {});
}

main().catch((error) => {
  cleanupActiveVite();
  fail(error instanceof Error ? error.message : String(error));
});
