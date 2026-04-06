import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), ".data");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readJsonFile<T>(filename: string): Promise<T | null> {
  await ensureDataDir();

  try {
    const fullPath = path.join(dataDir, filename);
    const raw = await readFile(fullPath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function writeJsonFile<T>(filename: string, value: T) {
  await ensureDataDir();
  const fullPath = path.join(dataDir, filename);
  await writeFile(fullPath, JSON.stringify(value, null, 2), "utf8");
}
