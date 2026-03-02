import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function run(command: string, args: string[], cwd: string, inherit = false): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
  });

  if (result.status !== 0) {
    const details = (result.stderr || result.stdout || "command failed").trim();
    throw new Error(`${command} ${args.join(" ")} failed: ${details}`);
  }

  return (result.stdout || "").trim();
}

async function mustExist(path: string): Promise<void> {
  try {
    await fs.access(path);
  } catch {
    throw new Error(`Missing required path: ${path}`);
  }
}

async function readVersion(repoRoot: string): Promise<string> {
  const packageJson = JSON.parse(await fs.readFile(join(repoRoot, "package.json"), "utf8")) as {
    version?: string;
  };
  if (!packageJson.version) {
    throw new Error("package.json is missing version");
  }
  return packageJson.version;
}

async function main(): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, "..");

  const requiredPaths = [
    join(repoRoot, "skills", "copilot-subagent", "SKILL.md"),
    join(repoRoot, "skills", "copilot-subagent", "scripts", "copilot-result"),
    join(repoRoot, "scripts", "build-artifacts.ts"),
    join(repoRoot, "scripts", "deploy-local.ts"),
    join(repoRoot, "scripts", "release-local.ts"),
    join(repoRoot, "scripts", "verify.ts"),
  ];

  for (const path of requiredPaths) {
    await mustExist(path);
  }

  const helperPath = join(repoRoot, "skills", "copilot-subagent", "scripts", "copilot-result");
  const helpText = run(helperPath, ["--help"], repoRoot);
  if (!helpText.includes("--raw-tools")) {
    throw new Error("copilot-result --help output does not include --raw-tools");
  }

  run("bun", ["run", "build"], repoRoot, true);

  const version = await readVersion(repoRoot);
  const base = `copilot-subagent-v${version}`;
  const zipPath = join(repoRoot, "dist", `${base}.zip`);
  const skillPath = join(repoRoot, "dist", `${base}.skill`);

  await mustExist(zipPath);
  await mustExist(skillPath);

  const [zipStat, skillStat] = await Promise.all([fs.stat(zipPath), fs.stat(skillPath)]);
  if (zipStat.size !== skillStat.size) {
    throw new Error(`Artifact size mismatch: zip=${zipStat.size}, skill=${skillStat.size}`);
  }

  const zipList = run("unzip", ["-l", zipPath], repoRoot);
  const requiredEntries = [
    "copilot-subagent/SKILL.md",
    "copilot-subagent/scripts/copilot-result",
  ];

  for (const entry of requiredEntries) {
    if (!zipList.includes(entry)) {
      throw new Error(`Missing archive entry: ${entry}`);
    }
  }

  if (zipList.includes("__MACOSX") || zipList.includes(".DS_Store")) {
    throw new Error("Archive contains excluded junk entries (__MACOSX or .DS_Store)");
  }

  console.log("Verify checks passed.");
}

await main();
