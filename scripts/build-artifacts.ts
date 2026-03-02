import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_FILES = [
  "SKILL.md",
  join("scripts", "copilot-result"),
];

function fail(message: string): never {
  throw new Error(message);
}

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectoryFiltered(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;
    if (name === ".DS_Store" || name === "__MACOSX" || name.startsWith(".")) {
      continue;
    }

    const srcPath = join(src, name);
    const destPath = join(dest, name);

    if (entry.isDirectory()) {
      await copyDirectoryFiltered(srcPath, destPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
      const stat = await fs.stat(srcPath);
      await fs.chmod(destPath, stat.mode);
    }
  }
}

async function readVersion(repoRoot: string): Promise<string> {
  const packageJsonPath = join(repoRoot, "package.json");
  const raw = await fs.readFile(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  if (!parsed.version) {
    fail("package.json is missing a version field");
  }
  return parsed.version;
}

async function main(): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, "..");
  const skillSourceDir = join(repoRoot, "skills", "copilot-subagent");

  if (!(await exists(skillSourceDir))) {
    fail(`Missing source skill directory: ${skillSourceDir}`);
  }

  for (const relativePath of REQUIRED_FILES) {
    const requiredPath = join(skillSourceDir, relativePath);
    if (!(await exists(requiredPath))) {
      fail(`Missing required source file: ${requiredPath}`);
    }
  }

  const version = await readVersion(repoRoot);
  const artifactBase = `copilot-subagent-v${version}`;
  const distDir = join(repoRoot, "dist");
  const zipPath = join(distDir, `${artifactBase}.zip`);
  const skillPath = join(distDir, `${artifactBase}.skill`);

  await fs.mkdir(distDir, { recursive: true });
  await fs.rm(zipPath, { force: true });
  await fs.rm(skillPath, { force: true });

  const tempRoot = await fs.mkdtemp(join(tmpdir(), "copilot-subagent-skill-"));

  try {
    const stagedSkillDir = join(tempRoot, "copilot-subagent");
    await copyDirectoryFiltered(skillSourceDir, stagedSkillDir);

    const zipResult = spawnSync("zip", ["-r", "-q", zipPath, "copilot-subagent"], {
      cwd: tempRoot,
      encoding: "utf8",
    });

    if (zipResult.status !== 0) {
      const details = zipResult.stderr?.trim() || zipResult.stdout?.trim() || "unknown zip error";
      fail(`zip command failed: ${details}`);
    }

    await fs.copyFile(zipPath, skillPath);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }

  console.log(`Built artifacts:`);
  console.log(`- ${zipPath}`);
  console.log(`- ${skillPath}`);
}

await main();
