import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dist = "dist";

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await htmlFiles(path)));
    } else if (entry.name.endsWith(".html")) {
      files.push(path);
    }
  }
  return files;
}

const files = await htmlFiles(dist);
for (const file of files) {
  const html = await readFile(file, "utf8");
  const next = html.replaceAll("/2025/assets/", "assets/");
  if (next !== html) {
    await writeFile(file, next);
  }
}
