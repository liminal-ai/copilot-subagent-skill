import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
      const stat = await fs.stat(srcPath);
      await fs.chmod(destPath, stat.mode);
    }
  }
}

async function listFiles(dir: string, root: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath, root)));
    } else if (entry.isFile()) {
      files.push(relative(root, fullPath));
    }
  }

  return files.sort();
}

async function main(): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, "..");
  const sourceDir = join(repoRoot, "skills", "copilot-subagent");
  const targetRoot = join(homedir(), ".claude", "skills");
  const targetDir = join(targetRoot, "copilot-subagent");

  if (!(await exists(sourceDir))) {
    fail(`Missing source directory: ${sourceDir}`);
  }

  await fs.mkdir(targetRoot, { recursive: true });
  await fs.rm(targetDir, { recursive: true, force: true });
  await copyDirectory(sourceDir, targetDir);

  const deployedScript = join(targetDir, "scripts", "copilot-result");
  if (await exists(deployedScript)) {
    await fs.chmod(deployedScript, 0o755);
  }

  const files = await listFiles(targetDir, targetDir);

  console.log(`Deployed skill to: ${targetDir}`);
  console.log(`Files:`);
  for (const file of files) {
    console.log(`- ${file}`);
  }
}

await main();
