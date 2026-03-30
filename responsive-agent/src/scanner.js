// ============================================================
// RESPONSIVE AGENT — File Scanner & Project Detector
// ============================================================

import { readdir, stat, readFile } from "node:fs/promises";
import { join, extname, relative } from "node:path";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  ".svelte-kit", "coverage", ".cache", "public", "assets",
  "responsive-agent",
]);

const SCAN_EXTENSIONS = new Set([
  ".css", ".scss", ".less",
  ".jsx", ".tsx", ".js", ".ts",
  ".vue", ".svelte",
  ".html", ".htm",
]);

/**
 * Detect what framework the project uses
 */
export async function detectFramework(rootDir) {
  const pkgPath = join(rootDir, "package.json");
  try {
    const raw = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw);
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (allDeps["next"]) return { name: "Next.js", styling: detectStyling(allDeps) };
    if (allDeps["react"]) return { name: "React", styling: detectStyling(allDeps) };
    if (allDeps["vue"]) return { name: "Vue", styling: detectStyling(allDeps) };
    if (allDeps["@angular/core"]) return { name: "Angular", styling: detectStyling(allDeps) };
    if (allDeps["svelte"]) return { name: "Svelte", styling: detectStyling(allDeps) };
    return { name: "Vanilla JS", styling: detectStyling(allDeps) };
  } catch {
    return { name: "Unknown", styling: [] };
  }
}

function detectStyling(deps) {
  const styles = [];
  if (deps["tailwindcss"]) styles.push("Tailwind CSS");
  if (deps["styled-components"]) styles.push("Styled Components");
  if (deps["@emotion/react"] || deps["@emotion/styled"]) styles.push("Emotion");
  if (deps["sass"] || deps["node-sass"]) styles.push("SASS/SCSS");
  if (deps["less"]) styles.push("LESS");
  if (deps["@mui/material"]) styles.push("Material UI");
  if (deps["bootstrap"]) styles.push("Bootstrap");
  if (deps["antd"]) styles.push("Ant Design");
  return styles;
}

/**
 * Recursively scan directory and return all matching files
 */
export async function scanFiles(dir, rootDir = dir) {
  const results = [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        const children = await scanFiles(fullPath, rootDir);
        results.push(...children);
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (SCAN_EXTENSIONS.has(ext)) {
        const stats = await stat(fullPath);
        results.push({
          path: fullPath,
          relativePath: relative(rootDir, fullPath),
          extension: ext,
          size: stats.size,
        });
      }
    }
  }

  return results;
}

/**
 * Read file content safely
 */
export async function readFileContent(filePath) {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Get project summary stats
 */
export function getProjectStats(files) {
  const stats = {
    totalFiles: files.length,
    byExtension: {},
    totalSize: 0,
  };

  for (const f of files) {
    stats.totalSize += f.size;
    stats.byExtension[f.extension] = (stats.byExtension[f.extension] || 0) + 1;
  }

  return stats;
}
