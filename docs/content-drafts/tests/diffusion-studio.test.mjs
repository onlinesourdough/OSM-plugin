import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DIFFUSION_BRANCH,
  DIFFUSION_COMPANION_CAPABILITIES,
  DIFFUSION_COMPANION_PROTOCOL,
  DIFFUSION_FORK,
  DIFFUSION_OFFICIAL,
  DIFFUSION_REVISION,
  DIFFUSION_UPSTREAM_BASE,
  DIFFUSION_VERSION,
  dapiInvocation,
  describe,
  parseArguments,
  resolveCheckout,
  resolvePackagedHost,
  resolveProductionProject,
  setupInvocations,
  validateCompanionStart,
} from "../../skills/diffusion-studio/scripts/diffusion-studio.mjs";

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const productionRoot = mkdtempSync(path.join(os.tmpdir(), "content-productions-"));
import { after } from "node:test";
after(() => rmSync(productionRoot, { recursive: true, force: true }));
const launcherPath = path.resolve(testsDirectory, "../../skills/diffusion-studio/scripts/diffusion-studio.mjs");

function companionFixture() {
  const projectId = "bounded-production";
  const buildHash = "a".repeat(24);
  return {
    active: true,
    appVersion: DIFFUSION_VERSION,
    protocol: DIFFUSION_COMPANION_PROTOCOL,
    hostLocalOnly: true,
    hostWindowMode: "hidden",
    egressAttempts: 0,
    project: { id: projectId, name: projectId, displayName: "Bounded production" },
    buildHash,
    url: `http://127.0.0.1:45678/projects/${projectId}?companion-shell=1#companion=${"A".repeat(43)}&build=${buildHash}`,
    capabilities: { ...DIFFUSION_COMPANION_CAPABILITIES },
  };
}

test("Diffusion fork, branch, pin, and official base stay explicit", () => {
  assert.equal(DIFFUSION_FORK, "https://github.com/onlinesourdough/editor.git");
  assert.equal(DIFFUSION_OFFICIAL, "https://github.com/diffusionstudio/editor.git");
  assert.equal(DIFFUSION_BRANCH, "codex/diffusion-upstream-browser-companion-r6");
  assert.equal(DIFFUSION_REVISION, "71a306fb33d06f969114a47e9eba85aa47cef395");
  assert.equal(DIFFUSION_UPSTREAM_BASE, "635a2907d9dd717879d6f7bdf9a78ee42910415c");
});

test("platform checkout paths are deterministic and external to ACS", () => {
  assert.equal(
    resolveCheckout("darwin", {}, "/Users/owner"),
    "/Users/owner/Library/Application Support/Agentic Content System/diffusion-studio/editor",
  );
  assert.equal(
    resolveCheckout("linux", {}, "/home/owner"),
    "/home/owner/.local/share/agentic-content-system/diffusion-studio/editor",
  );
  assert.equal(
    resolveCheckout("win32", { LOCALAPPDATA: "C:\\Users\\owner\\AppData\\Local" }),
    "C:\\Users\\owner\\AppData\\Local\\Agentic Content System\\diffusion-studio\\editor",
  );
});

test("setup uses the official origin, thin fork, exact pin, npm lock install, and declared package command", () => {
  const checkout = "/tmp/diffusion/editor";
  const invocations = setupInvocations(checkout, "darwin");
  assert.deepEqual(invocations[0], { command: "git", args: ["clone", DIFFUSION_OFFICIAL, checkout] });
  assert.deepEqual(invocations[1], { command: "git", args: ["-C", checkout, "remote", "add", "fork", DIFFUSION_FORK] });
  assert.deepEqual(invocations[2].args, ["-C", checkout, "fetch", "fork", DIFFUSION_BRANCH]);
  assert.deepEqual(invocations[3].args, ["-C", checkout, "checkout", "--detach", DIFFUSION_REVISION]);
  assert.deepEqual(invocations[4], { command: "npm", args: ["ci"] });
  assert.deepEqual(invocations[5], {
    command: "npm",
    args: ["run", "package", "--workspace=@diffusionstudio/desktop"],
    envFrom: "apps/web/.env.example",
  });
});

test("packaged hidden-host paths and DAPI command construction stay platform-specific", () => {
  assert.equal(
    resolvePackagedHost("/editor", "darwin", "arm64"),
    "/editor/apps/desktop/out/Diffusion Studio-darwin-arm64/Diffusion Studio.app/Contents/MacOS/Diffusion Studio",
  );
  assert.equal(
    resolvePackagedHost("C:\\editor", "win32", "x64"),
    "C:\\editor\\apps\\desktop\\out\\Diffusion Studio-win32-x64\\Diffusion Studio.exe",
  );
  assert.equal(
    resolvePackagedHost("/editor", "linux", "x64"),
    "/editor/apps/desktop/out/Diffusion Studio-linux-x64/diffusion-studio",
  );
  assert.deepEqual(dapiInvocation("/editor", "status", undefined, "darwin"), {
    command: process.execPath,
    args: ["/editor/apps/cli/dist/index.js", "browser", "--status"],
  });
  assert.deepEqual(dapiInvocation("/editor", "status", undefined, "linux"), {
    command: process.execPath,
    args: ["/editor/apps/cli/dist/index.js", "browser", "--status"],
  });
  assert.deepEqual(dapiInvocation("C:\\editor", "status", undefined, "win32"), {
    command: process.execPath,
    args: ["C:\\editor\\apps\\cli\\dist\\index.js", "browser", "--status"],
  });
});

test("Linux and Windows descriptions make no physical parity claim", () => {
  for (const platform of ["linux", "win32"]) {
    const result = describe(platform, "x64");
    assert.match(result.parity, /command\/path construction only/);
    assert.match(result.browser, /Codex built-in browser/);
  }
  assert.match(describe("darwin", "arm64").parity, /historical ACS macOS acceptance/);
});

test("open accepts only a real Diffusion project under the ACS production boundary", () => {
  assert.throws(() => resolveProductionProject("/tmp/not-an-acs-production", productionRoot), /Project must stay within/);
  assert.throws(() => resolveProductionProject("not-present", productionRoot), /missing/);
});

test("production containment uses canonical filesystem identity and preserves ordinary in-root projects", (t) => {
  const inside = mkdtempSync(path.join(productionRoot, ".diffusion-project-test-"));
  const outside = mkdtempSync(path.join(os.tmpdir(), "acs-diffusion-outside-"));
  t.after(() => {
    rmSync(inside, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });

  writeFileSync(path.join(outside, "package.json"), '{"projectId":"outside"}\n');
  const escaped = path.join(inside, "outside-project");
  symlinkSync(outside, escaped, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => resolveProductionProject(escaped, productionRoot), /Project must stay within/);

  const accepted = path.join(inside, "inside-project");
  mkdirSync(accepted);
  writeFileSync(path.join(accepted, "package.json"), '{"projectId":"inside"}\n');
  assert.equal(resolveProductionProject(accepted, productionRoot), realpathSync(accepted));
});

test("a package.json symlink cannot escape its canonical project", { skip: process.platform === "win32" }, (t) => {
  const inside = mkdtempSync(path.join(productionRoot, ".diffusion-manifest-test-"));
  const outside = mkdtempSync(path.join(os.tmpdir(), "acs-diffusion-manifest-"));
  t.after(() => {
    rmSync(inside, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });
  const project = path.join(inside, "project");
  mkdirSync(project);
  const manifest = path.join(outside, "package.json");
  writeFileSync(manifest, '{"projectId":"outside-manifest"}\n');
  symlinkSync(manifest, path.join(project, "package.json"), "file");
  assert.throws(() => resolveProductionProject(project, productionRoot), /package\.json must stay within/);
});

test("CLI rejects checkout overrides while describe retains platform and architecture options", () => {
  assert.throws(() => parseArguments(["describe", "--checkout", "/tmp/editor"]), /Unknown option: --checkout/);
  assert.deepEqual(parseArguments(["describe", "--platform", "linux", "--arch", "x64"]), {
    command: "describe",
    platform: "linux",
    architecture: "x64",
    operands: [],
  });

  const denied = spawnSync(process.execPath, [launcherPath, "describe", "--checkout", "/tmp/editor"], { encoding: "utf8" });
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /Unknown option: --checkout/);

  const described = JSON.parse(execFileSync(process.execPath, [launcherPath, "describe", "--platform", "linux", "--arch", "x64"], { encoding: "utf8" }));
  assert.equal(described.platform, "linux");
  assert.equal(described.architecture, "x64");
});

test("browser companion start validation accepts only the pinned Phase-A contract", () => {
  const valid = companionFixture();
  assert.equal(validateCompanionStart(valid, valid.project.id), valid);
  assert.throws(() => validateCompanionStart(null, valid.project.id), /response/);

  const wrongVersion = structuredClone(valid);
  wrongVersion.appVersion = "0.205.0";
  assert.throws(() => validateCompanionStart(wrongVersion, valid.project.id), /appVersion/);

  const wrongProtocol = structuredClone(valid);
  wrongProtocol.protocol = 5;
  assert.throws(() => validateCompanionStart(wrongProtocol, valid.project.id), /protocol/);

  const widened = structuredClone(valid);
  widened.capabilities.persistentEdits = true;
  assert.throws(() => validateCompanionStart(widened, valid.project.id), /capabilities\.persistentEdits/);

  const extraCapability = structuredClone(valid);
  extraCapability.capabilities.export = true;
  assert.throws(() => validateCompanionStart(extraCapability, valid.project.id), /keys must exactly match/);

  const localhost = structuredClone(valid);
  localhost.url = localhost.url.replace("127.0.0.1", "localhost");
  assert.throws(() => validateCompanionStart(localhost, valid.project.id), /url/);

  const wrongRoute = structuredClone(valid);
  wrongRoute.url = wrongRoute.url.replace(`/projects/${valid.project.id}`, "/projects/other");
  assert.throws(() => validateCompanionStart(wrongRoute, valid.project.id), /url path/);

  const missingIdentity = structuredClone(valid);
  missingIdentity.url = missingIdentity.url.split("#")[0];
  assert.throws(() => validateCompanionStart(missingIdentity, valid.project.id), /url fragment/);

  const wrongBuild = structuredClone(valid);
  wrongBuild.url = wrongBuild.url.replace(`build=${valid.buildHash}`, `build=${"b".repeat(24)}`);
  assert.throws(() => validateCompanionStart(wrongBuild, valid.project.id), /url build/);
});
