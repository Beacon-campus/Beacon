// ============================================================
// RESPONSIVE AGENT — CSS Auto-Fixer
// ============================================================

import { CSS_RULES } from "../rules/patterns.js";
import { readFile, writeFile } from "node:fs/promises";

/**
 * Auto-fix CSS responsiveness issues
 * Returns { fixedContent, fixCount, fixes[] }
 */
export async function fixCSSFile(filePath, dryRun = false) {
  const content = await readFile(filePath, "utf-8");
  let fixedContent = content;
  const fixes = [];

  for (const rule of CSS_RULES) {
    if (!rule.autoFixable || !rule.pattern || !rule.fix) continue;

    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;

    while ((match = regex.exec(fixedContent)) !== null) {
      const original = match[0];
      const value = match[1];
      const replacement = rule.fix(original, value);

      if (replacement && replacement !== original) {
        fixes.push({
          ruleId: rule.id,
          original,
          replacement,
          line: fixedContent.substring(0, match.index).split("\n").length,
        });

        // Apply fix
        fixedContent =
          fixedContent.substring(0, match.index) +
          replacement +
          fixedContent.substring(match.index + original.length);

        // Reset regex since string changed
        regex.lastIndex = 0;
      }
    }
  }

  // Write back if not dry run
  if (!dryRun && fixes.length > 0) {
    await writeFile(filePath, fixedContent, "utf-8");
  }

  return {
    fixedContent,
    fixCount: fixes.length,
    fixes,
  };
}

/**
 * Generate responsive media query suggestions for a CSS file
 */
export function generateMediaQuerySuggestions(content) {
  const suggestions = [];

  // Find all selectors and their properties
  const selectorRegex = /([^{}]+)\{([^}]+)\}/g;
  let match;

  while ((match = selectorRegex.exec(content)) !== null) {
    const selector = match[1].trim();
    const properties = match[2];

    // Skip if already inside a media query
    if (selector.includes("@media")) continue;

    // Check for properties that should be responsive
    const hasFixedWidth = /width\s*:\s*\d{3,}px/.test(properties);
    const hasFontSize = /font-size\s*:\s*\d+px/.test(properties);
    const hasColumns = /(?:grid-template-columns|columns)\s*:/.test(properties);

    if (hasFixedWidth || hasColumns) {
      suggestions.push({
        selector,
        suggestion: `@media (max-width: 768px) {\n  ${selector} {\n    width: 100%;\n    ${hasColumns ? "grid-template-columns: 1fr;" : ""}\n  }\n}`,
      });
    }

    if (hasFontSize) {
      const fontSize = properties.match(/font-size\s*:\s*(\d+)px/);
      if (fontSize && parseInt(fontSize[1]) > 20) {
        const mobileSize = Math.round(parseInt(fontSize[1]) * 0.75);
        suggestions.push({
          selector,
          suggestion: `@media (max-width: 640px) {\n  ${selector} {\n    font-size: ${mobileSize}px;\n  }\n}`,
        });
      }
    }
  }

  return suggestions;
}
