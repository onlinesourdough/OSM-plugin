#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DIFFUSION_FORK = "https://github.com/onlinesourdough/editor.git";
export const DIFFUSION_OFFICIAL = "https://github.com/diffusionstudio/editor.git";
export const DIFFUSION_BRANCH = "codex/diffusion-upstream-browser-companion-r6";
export const DIFFUSION_REVISION = "71a306fb33d06f969114a47e9eba85aa47cef395";
export const DIFFUSION_UPSTREAM_BASE = "635a2907d9dd717879d6f7bdf9a78ee42910415c";
export const DIFFUSION_PACKAGE_MANAGER = "npm";
export const DIFFUSION_VERSION = "0.204.1";
export const DIFFUSION_COMPANION_PROTOCOL = 4;

export const DIFFUSION_COMPANION_CAPABILITIES = Object.freeze({
  readOnly: true,
  browserDapi: false,
  cloudAi: false,
  persistentEdits: false,
  htmlPaint: false,
  media: "unsupported-phase-a",
  webgpu: "browser-dependent",
  fonts: "browser-dependent",
  trustedProjectCode: true,
});

const packageRoot = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."));

// Resolve existing ancestors as well as a future leaf so symlinks cannot move
// work data or generated caches into the immutable installed package.
export function canonicalPath(candidate) {
  if (existsSync(candidate)) return realpathSync(candidate);
  const parent = path.dirname(candidate);
  if (parent === candidate) return candidate;
  return path.join(canonicalPath(parent), path.basename(candidate));
}

export function externalPath(candidate, label) {
  if (!candidate || !path.isAbsolute(candidate)) throw new Error(`${label} must be an absolute external path`);
  const resolved = canonicalPath(path.resolve(candidate));
  if (containedPath(packageRoot, resolved) || containedPath(resolved, packageRoot)) {
    throw new Error(`${label} must not overlap the immutable skill package`);
  }
  return resolved;
}

export function resolveCheckout(platform = process.platform, environment = process.env, homeDirectory = os.homedir()) {
  if (platform === "win32") {
    if (!environment.LOCALAPPDATA) throw new Error("LOCALAPPDATA is required on Windows");
    return path.win32.join(environment.LOCALAPPDATA, "Agentic Content System", "diffusion-studio", "editor");
  }
  if (platform === "darwin") {
    if (!homeDirectory) throw new Error("A home directory is required");
    return path.posix.join(homeDirectory, "Library", "Application Support", "Agentic Content System", "diffusion-studio", "editor");
  }
  if (platform === "linux") {
    if (!homeDirectory) throw new Error("A home directory is required");
    return path.posix.join(homeDirectory, ".local", "share", "agentic-content-system", "diffusion-studio", "editor");
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

export function setupInvocations(checkout, platform = process.platform) {
  const npm = platform === "win32" ? "npm.cmd" : "npm";
  return [
    { command: "git", args: ["clone", DIFFUSION_OFFICIAL, checkout] },
    { command: "git", args: ["-C", checkout, "remote", "add", "fork", DIFFUSION_FORK] },
    { command: "git", args: ["-C", checkout, "fetch", "fork", DIFFUSION_BRANCH] },
    { command: "git", args: ["-C", checkout, "checkout", "--detach", DIFFUSION_REVISION] },
    { command: npm, args: ["ci"] },
    {
      command: npm,
      args: ["run", "package", "--workspace=@diffusionstudio/desktop"],
      envFrom: "apps/web/.env.example",
    },
  ];
}

export function readPublicBuildEnvironment(checkout) {
  const examplePath = path.join(checkout, "apps", "web", ".env.example");
  if (!existsSync(examplePath)) throw new Error(`Upstream public build environment is missing: ${examplePath}`);
  const parsed = {};
  for (const line of readFileSync(examplePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) parsed[match[1]] = match[2];
  }
  for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
    if (!parsed[key]) throw new Error(`${key} is missing from upstream .env.example`);
  }
  return parsed;
}

export function resolveDapi(checkout, platform = process.platform) {
  const modulePath = ["apps", "cli", "dist", "index.js"];
  return platform === "win32" ? path.win32.join(checkout, ...modulePath) : path.posix.join(checkout, ...modulePath);
}

export function resolvePackagedHost(checkout, platform = process.platform, architecture = process.arch) {
  if (platform === "darwin") {
    return path.posix.join(
      checkout,
      "apps",
      "desktop",
      "out",
      `Diffusion Studio-${platform}-${architecture}`,
      "Diffusion Studio.app",
      "Contents",
      "MacOS",
      "Diffusion Studio",
    );
  }
  if (platform === "win32") {
    return path.win32.join(
      checkout,
      "apps",
      "desktop",
      "out",
      `Diffusion Studio-${platform}-${architecture}`,
      "Diffusion Studio.exe",
    );
  }
  if (platform === "linux") {
    return path.posix.join(
      checkout,
      "apps",
      "desktop",
      "out",
      `Diffusion Studio-${platform}-${architecture}`,
      "diffusion-studio",
    );
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

export function dapiInvocation(checkout, action, project, platform = process.platform) {
  const args = [resolveDapi(checkout, platform)];
  if (action === "open") args.push("browser", project);
  else if (["status", "logs", "stop"].includes(action)) args.push("browser", `--${action}`);
  else throw new Error(`Unsupported DAPI action: ${action}`);
  return { command: process.execPath, args };
}

function git(checkout, args) {
  return execFileSync("git", ["-C", checkout, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function remoteHead(url, ref) {
  try {
    const output = execFileSync("git", ["ls-remote", url, ref], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 20_000,
    }).trim();
    return output ? output.split(/\s+/, 1)[0] : null;
  } catch {
    return null;
  }
}

export function inspectCheckout(checkout = resolveCheckout(), options = {}) {
  const { requireBuild = true, includeLive = true, platform = process.platform, architecture = process.arch } = options;
  const failures = [];
  if (!existsSync(checkout)) return { ok: false, checkout, failures: ["checkout is missing"] };

  let revision;
  let branch;
  let status;
  let officialRemote;
  let forkRemote;
  let mergeBase;
  try {
    revision = git(checkout, ["rev-parse", "HEAD"]);
    branch = git(checkout, ["branch", "--show-current"]);
    status = git(checkout, ["status", "--porcelain"]);
    officialRemote = git(checkout, ["remote", "get-url", "origin"]);
    forkRemote = git(checkout, ["remote", "get-url", "fork"]);
    mergeBase = git(checkout, ["merge-base", "HEAD", DIFFUSION_UPSTREAM_BASE]);
  } catch (error) {
    return { ok: false, checkout, failures: [`git check failed: ${error.message}`] };
  }

  if (revision !== DIFFUSION_REVISION) failures.push(`HEAD is ${revision}`);
  if (branch && branch !== DIFFUSION_BRANCH) failures.push(`branch is ${branch}`);
  if (status !== "") failures.push("checkout has uncommitted state");
  if (officialRemote !== DIFFUSION_OFFICIAL) failures.push(`origin is ${officialRemote}`);
  if (forkRemote !== DIFFUSION_FORK) failures.push(`fork is ${forkRemote}`);
  if (mergeBase !== DIFFUSION_UPSTREAM_BASE) failures.push(`upstream merge-base is ${mergeBase}`);

  const packagePath = path.join(checkout, "package.json");
  let version;
  if (!existsSync(packagePath)) failures.push("package.json is missing");
  else {
    version = JSON.parse(readFileSync(packagePath, "utf8")).version;
    if (version !== DIFFUSION_VERSION) failures.push(`package version is ${version}`);
  }
  if (!existsSync(path.join(checkout, "package-lock.json"))) failures.push("package-lock.json is missing; npm is not pinned by a lockfile");
  if (requireBuild) {
    if (!existsSync(path.join(checkout, "node_modules"))) failures.push("node_modules is missing; run setup");
    if (!existsSync(resolveDapi(checkout, platform))) failures.push("built DAPI CLI is missing; run setup");
    if (!existsSync(resolvePackagedHost(checkout, platform, architecture))) failures.push("packaged Electron host is missing; run setup");
  }

  const forkLive = includeLive ? remoteHead(DIFFUSION_FORK, `refs/heads/${DIFFUSION_BRANCH}`) : undefined;
  const upstreamLive = includeLive ? remoteHead(DIFFUSION_OFFICIAL, "refs/heads/main") : undefined;
  return {
    ok: failures.length === 0,
    checkout,
    revision,
    branch: branch || "detached",
    officialRemote,
    forkRemote,
    mergeBase,
    version,
    runtimeNode: process.version,
    packageManager: DIFFUSION_PACKAGE_MANAGER,
    packagedHost: resolvePackagedHost(checkout, platform, architecture),
    drift: includeLive
      ? {
          forkLive,
          forkChangedSincePin: forkLive === null ? "unknown" : forkLive !== DIFFUSION_REVISION,
          upstreamLive,
          upstreamChangedSinceBase: upstreamLive === null ? "unknown" : upstreamLive !== DIFFUSION_UPSTREAM_BASE,
          action: "Keep the pin. Re-pin only in a bounded update after rebasing the thin fork and repeating Studio/browser acceptance.",
        }
      : undefined,
    failures,
  };
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim();
}

export function runDapi(checkout, args) {
  checkout = externalPath(checkout, "Editor checkout");
  const dapi = resolveDapi(checkout);
  return run(process.execPath, [dapi, ...args], { cwd: checkout });
}

export function resolveProductionProject(candidate, root) {
  const productionRoot = externalPath(root, "Production root");
  if (!existsSync(productionRoot)) throw new Error(`Production root is missing: ${productionRoot}`);
  if (!candidate) throw new Error("A Diffusion project path is required");
  const requested = canonicalPath(path.resolve(productionRoot, candidate));
  if (!containedPath(productionRoot, requested)) {
    throw new Error(`Project must stay within ${productionRoot}`);
  }
  if (!existsSync(requested)) {
    throw new Error(`Diffusion project or package.json is missing: ${requested}`);
  }

  const canonicalProductionRoot = realpathSync(productionRoot);
  const project = realpathSync(requested);
  if (!containedPath(canonicalProductionRoot, project)) {
    throw new Error(`Project must stay within ${canonicalProductionRoot}`);
  }

  const packagePath = path.join(project, "package.json");
  if (!existsSync(packagePath)) throw new Error(`Diffusion project or package.json is missing: ${project}`);
  const canonicalPackage = realpathSync(packagePath);
  if (!containedPath(project, canonicalPackage)) {
    throw new Error("Diffusion package.json must stay within the canonical project boundary");
  }
  return project;
}

function containedPath(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function companionError(field, expectation) {
  throw new Error(`Invalid browser companion ${field}: ${expectation}`);
}

export function validateCompanionStart(value, expectedProjectId) {
  if (!value || typeof value !== "object" || Array.isArray(value)) companionError("response", "an object is required");
  if (value.active !== true) companionError("active", "must be true");
  if (value.appVersion !== DIFFUSION_VERSION) companionError("appVersion", `must be ${DIFFUSION_VERSION}`);
  if (value.protocol !== DIFFUSION_COMPANION_PROTOCOL) {
    companionError("protocol", `must be ${DIFFUSION_COMPANION_PROTOCOL}`);
  }
  if (value.hostLocalOnly !== true) companionError("hostLocalOnly", "must be true");
  if (value.hostWindowMode !== "hidden" && value.hostWindowMode !== "minimized-fallback") {
    companionError("hostWindowMode", "must be hidden or minimized-fallback");
  }
  if (value.egressAttempts !== 0) companionError("egressAttempts", "must be zero");
  if (typeof expectedProjectId !== "string" || !expectedProjectId) companionError("project", "an expected project id is required");
  if (!value.project || typeof value.project !== "object" || value.project.id !== expectedProjectId) {
    companionError("project.id", `must be ${expectedProjectId}`);
  }

  const capabilities = value.capabilities;
  if (!capabilities || typeof capabilities !== "object" || Array.isArray(capabilities)) {
    companionError("capabilities", "an exact Phase-A object is required");
  }
  const expectedCapabilityKeys = Object.keys(DIFFUSION_COMPANION_CAPABILITIES).sort();
  const capabilityKeys = Object.keys(capabilities).sort();
  if (capabilityKeys.length !== expectedCapabilityKeys.length || capabilityKeys.some((key, index) => key !== expectedCapabilityKeys[index])) {
    companionError("capabilities", "keys must exactly match the reviewed Phase-A surface");
  }
  for (const [key, expected] of Object.entries(DIFFUSION_COMPANION_CAPABILITIES)) {
    if (capabilities[key] !== expected) companionError(`capabilities.${key}`, `must be ${String(expected)}`);
  }

  if (typeof value.url !== "string") companionError("url", "must be a string");
  let companionUrl;
  try {
    companionUrl = new URL(value.url);
  } catch {
    companionError("url", "must be a valid URL");
  }
  if (
    companionUrl.protocol !== "http:" ||
    companionUrl.hostname !== "127.0.0.1" ||
    !companionUrl.port ||
    companionUrl.username ||
    companionUrl.password
  ) {
    companionError("url", "must be an unauthenticated HTTP URL on 127.0.0.1 with an explicit port");
  }
  const expectedRoute = `/projects/${encodeURIComponent(expectedProjectId)}`;
  if (companionUrl.pathname !== expectedRoute) companionError("url path", `must be ${expectedRoute}`);
  const queryEntries = [...companionUrl.searchParams.entries()];
  if (queryEntries.length !== 1 || queryEntries[0][0] !== "companion-shell" || queryEntries[0][1] !== "1") {
    companionError("url query", "must contain only companion-shell=1");
  }

  const fragment = new URLSearchParams(companionUrl.hash.slice(1));
  const fragmentKeys = [...fragment.keys()].sort();
  if (fragmentKeys.length !== 2 || fragmentKeys[0] !== "build" || fragmentKeys[1] !== "companion") {
    companionError("url fragment", "must contain only companion and build identities");
  }
  const capability = fragment.get("companion");
  if (!capability || !/^[A-Za-z0-9_-]{43}$/.test(capability) || Buffer.from(capability, "base64url").length !== 32) {
    companionError("url capability", "must be a 32-byte base64url one-time capability");
  }
  const build = fragment.get("build");
  if (typeof value.buildHash !== "string" || !/^[a-f0-9]{24}$/.test(value.buildHash) || build !== value.buildHash) {
    companionError("url build", "must exactly match the 24-hex response buildHash");
  }
  return value;
}

function dapiJson(checkout, args) {
  const output = runDapi(checkout, args);
  return output ? JSON.parse(output) : null;
}

function runtimeHealthy(checkout) {
  try {
    dapiJson(checkout, ["context"]);
    return true;
  } catch {
    return false;
  }
}

async function ensurePinnedHost(checkout, platform = process.platform, architecture = process.arch) {
  if (runtimeHealthy(checkout)) return;
  const executable = resolvePackagedHost(checkout, platform, architecture);
  const child = spawn(executable, ["--hidden", "--browser-companion-host"], {
    cwd: checkout,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (runtimeHealthy(checkout)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Pinned hidden Electron host did not expose a healthy DAPI socket within 30 seconds");
}

function setup(checkout) {
  checkout = externalPath(checkout, "Editor checkout");
  if (!existsSync(checkout)) {
    mkdirSync(path.dirname(checkout), { recursive: true });
    for (const invocation of setupInvocations(checkout).slice(0, 4)) {
      run(invocation.command, invocation.args);
    }
  }
  const before = inspectCheckout(checkout, { requireBuild: false, includeLive: false });
  if (!before.ok) throw new Error(`Refusing setup on a mismatched checkout: ${before.failures.join("; ")}`);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(npm, ["ci"], { cwd: checkout, stdio: "inherit" });
  execFileSync(npm, ["run", "package", "--workspace=@diffusionstudio/desktop"], {
    cwd: checkout,
    env: { ...process.env, ...readPublicBuildEnvironment(checkout), SKIP_SIGN: "1" },
    stdio: "inherit",
  });
  return inspectCheckout(checkout);
}

export function parseArguments(argumentsList) {
  const result = { command: argumentsList[0] || "check", platform: process.platform, architecture: undefined, operands: [] };
  let platformOption = false;
  let architectureOption = false;
  for (let index = 1; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--production-root") {
      const next = argumentsList[++index];
      if (!next || next.startsWith("--")) throw new Error("--production-root requires a value");
      if (result.productionRoot) throw new Error("--production-root must be supplied only once");
      result.productionRoot = next;
    } else if (argument === "--platform" || argument === "--arch") {
      const next = argumentsList[index + 1];
      if (!next || next.startsWith("--")) throw new Error(`${argument} requires a value`);
      if (argument === "--platform") {
        result.platform = next;
        platformOption = true;
      } else {
        result.architecture = next;
        architectureOption = true;
      }
      index += 1;
    } else if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}`);
    } else result.operands.push(argument);
  }
  if (result.command !== "describe" && (platformOption || architectureOption)) {
    throw new Error("--platform and --arch are supported only by describe");
  }
  if (!["describe", "setup", "check", "open", "status", "logs", "stop"].includes(result.command)) {
    throw new Error(`Unknown command: ${result.command}`);
  }
  if (result.command === "open") {
    if (!result.productionRoot) throw new Error("open requires --production-root");
    if (result.operands.length !== 1) throw new Error("open requires exactly one project path");
  } else if (result.productionRoot || result.operands.length) {
    throw new Error(`${result.command} does not accept a production root or operands`);
  }
  return result;
}

export function describe(platform, architecture = platform === "darwin" ? "arm64" : "x64") {
  const environment = platform === "win32" ? { LOCALAPPDATA: "C:\\Users\\owner\\AppData\\Local" } : {};
  const home = platform === "darwin" ? "/Users/owner" : platform === "linux" ? "/home/owner" : undefined;
  const checkout = resolveCheckout(platform, environment, home);
  return {
    platform,
    architecture,
    checkout,
    setup: setupInvocations(checkout, platform),
    packagedHost: resolvePackagedHost(checkout, platform, architecture),
    dapi: dapiInvocation(checkout, "open", platform === "win32" ? "C:\\content\\production" : "/content/production", platform),
    browser: "Open only the returned one-time URL in the Codex built-in browser. Never launch an OS browser.",
    parity: platform === "darwin" ? "historical ACS macOS acceptance; this migration does not claim a new physical run" : "command/path construction only; physical Electron parity is not claimed",
  };
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.command === "describe") {
      console.log(JSON.stringify(describe(options.platform, options.architecture), null, 2));
      return;
    }
    const project = options.command === "open" ? resolveProductionProject(options.operands[0], options.productionRoot) : undefined;
    const checkout = externalPath(resolveCheckout(options.platform), "Editor checkout");
    if (options.command === "setup") {
      console.log(JSON.stringify(setup(checkout), null, 2));
      return;
    }
    if (project && (containedPath(checkout, canonicalPath(options.productionRoot)) || containedPath(canonicalPath(options.productionRoot), checkout))) {
      throw new Error("Production root and editor checkout must be separate");
    }
    const inspected = inspectCheckout(checkout, { platform: options.platform, architecture: options.architecture });
    if (!inspected.ok) {
      console.error(JSON.stringify(inspected, null, 2));
      process.exitCode = 1;
      return;
    }
    if (options.command === "check") {
      console.log(JSON.stringify(inspected, null, 2));
      return;
    }
    if (options.command === "open") {
      if (options.operands.length !== 1) throw new Error("open requires exactly one project path");
      await ensurePinnedHost(checkout, options.platform, options.architecture);
      let companion;
      try {
        companion = JSON.parse(runDapi(checkout, ["browser", project]));
      } catch {
        throw new Error("Invalid browser companion response: valid JSON is required");
      }
      const manifest = JSON.parse(readFileSync(path.join(project, "package.json"), "utf8"));
      console.log(JSON.stringify(validateCompanionStart(companion, manifest.projectId)));
      return;
    }
    if (options.operands.length) throw new Error(`${options.command} does not accept operands`);
    if (options.command === "status") {
      console.log(JSON.stringify({ checkout: inspected, companion: dapiJson(checkout, ["browser", "--status"]), dapi: dapiJson(checkout, ["context"]) }, null, 2));
      return;
    }
    if (options.command === "logs") {
      console.log(JSON.stringify({
        companion: dapiJson(checkout, ["browser", "--logs"]),
        dapi: runDapi(checkout, ["logs"]).split("\n").filter(Boolean),
      }, null, 2));
      return;
    }
    if (options.command === "stop") {
      const stopped = dapiJson(checkout, ["browser", "--stop"]);
      console.log(JSON.stringify({ stopped, dapi: dapiJson(checkout, ["context"]) }, null, 2));
      return;
    }
    throw new Error(`Unknown command: ${options.command}`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
