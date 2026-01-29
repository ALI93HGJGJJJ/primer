import fs from "fs/promises";
import path from "path";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function safeWriteFile(filePath: string, content: string, force: boolean): Promise<string> {
  const exists = await fileExists(filePath);
  if (exists && !force) {
    return `Skipped ${path.relative(process.cwd(), filePath)} (exists)`;
  }

  await fs.writeFile(filePath, content, "utf8");
  return `Wrote ${path.relative(process.cwd(), filePath)}`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
