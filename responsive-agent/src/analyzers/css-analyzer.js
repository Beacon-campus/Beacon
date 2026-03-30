// ============================================================
// RESPONSIVE AGENT — CSS Analyzer
// ============================================================

import { CSS_RULES } from "../rules/patterns.js";

/**
 * Analyze a CSS file for responsiveness issues
 */
export function analyzeCSSFile(content, filePath) {
  const issues = [];
  const lines = content.split("\n");

  // 1. Check each pattern rule
  for (const rule of CSS_RULES) {
    if (rule.pattern === null) continue; // skip absence-based checks

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;

      while ((match = regex.exec(line)) !== null) {
        // Skip if inside a media query (basic detection)
        const context = getContext(lines, i);
        
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          category: rule.category,
          file: filePath,
          line: i + 1,
          column: match.index + 1,
          matchedText: match[0],
          capturedValue: match[1] || null,
          context: line.trim(),
          suggestion: rule.suggestion,
          autoFixable: rule.autoFixable,
          insideMediaQuery: context.insideMediaQuery,
        });
      }
    }
  }

  // 2. Check for missing media queries (absence detection)
  const hasMediaQueries = /@media\s/.test(content);
  if (!hasMediaQueries && content.length > 200) {
    issues.push({
      ruleId: "no-media-queries",
      ruleName: "No Media Queries Found",
      severity: "high",
      category: "responsiveness",
      file: filePath,
      line: 1,
      column: 1,
      matchedText: "(entire file)",
      capturedValue: null,
      context: "This stylesheet has no @media queries for responsive breakpoints",
      suggestion: "Add media queries for mobile (max-width: 640px), tablet (max-width: 1024px)",
      autoFixable: false,
      insideMediaQuery: false,
    });
  }

  // 3. Check for desktop-first vs mobile-first
  const minWidthQueries = (content.match(/@media\s*\([^)]*min-width/g) || []).length;
  const maxWidthQueries = (content.match(/@media\s*\([^)]*max-width/g) || []).length;
  
  if (minWidthQueries > 0 && maxWidthQueries > 0) {
    issues.push({
      ruleId: "mixed-breakpoints",
      ruleName: "Mixed Breakpoint Strategy",
      severity: "low",
      category: "responsiveness",
      file: filePath,
      line: 1,
      column: 1,
      matchedText: `${minWidthQueries} min-width + ${maxWidthQueries} max-width queries`,
      capturedValue: null,
      context: "File uses both min-width and max-width media queries — can cause confusion",
      suggestion: "Stick to one approach: mobile-first (min-width) or desktop-first (max-width)",
      autoFixable: false,
      insideMediaQuery: false,
    });
  }

  return issues;
}

/**
 * Get surrounding context for a line — checks if we're inside a media query
 */
function getContext(lines, lineIndex) {
  let braceDepth = 0;
  let insideMediaQuery = false;

  for (let i = 0; i <= lineIndex; i++) {
    const line = lines[i];
    if (/@media\s/.test(line)) {
      insideMediaQuery = true;
    }
    for (const ch of line) {
      if (ch === "{") braceDepth++;
      if (ch === "}") {
        braceDepth--;
        if (braceDepth <= 0) insideMediaQuery = false;
      }
    }
  }

  return { insideMediaQuery };
}
