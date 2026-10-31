import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "node_modules", "stockfish", "bin");
const targetDir = join(root, "public", "engine");

const files = [
  "stockfish-19-lite-single.js",
  "stockfish-19-lite-single.wasm",
  "Copying.txt",
];

if (!existsSync(sourceDir)) {
  console.warn("[copy-stockfish] stockfish package not found, skipping.");
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  const sourcePath =
    file === "Copying.txt"
      ? join(root, "node_modules", "stockfish", file)
      : join(sourceDir, file);
  const targetPath = join(targetDir, file);

  if (!existsSync(sourcePath)) {
    console.warn(`[copy-stockfish] missing source file: ${sourcePath}`);
    continue;
  }

  copyFileSync(sourcePath, targetPath);
  console.log(`[copy-stockfish] copied ${file}`);
}
