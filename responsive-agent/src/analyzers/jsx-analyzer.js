// ============================================================
// RESPONSIVE AGENT — JSX / Component Analyzer
// ============================================================

import { INLINE_STYLE_RULES, TAILWIND_RULES } from "../rules/patterns.js";

/**
 * Analyze JSX/TSX/Vue files for responsiveness issues
 */
export function analyzeComponentFile(content, filePath) {
  const issues = [];
  const lines = content.split("\n");
  const isTailwind = detectTailwindUsage(content);
  const rules = [...INLINE_STYLE_RULES, ...(isTailwind ? TAILWIND_RULES : [])];

  for (const rule of rules) {
    if (!rule.pattern) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;

      while ((match = regex.exec(line)) !== null) {
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          category: rule.category,
          file: filePath,
          line: i + 1,
          column: match.index + 1,
          matchedText: match[0].substring(0, 80),
          capturedValue: match[1] || null,
          context: line.trim().substring(0, 120),
          suggestion: rule.suggestion,
          autoFixable: rule.autoFixable,
          insideMediaQuery: false,
        });
      }
    }
  }

  // Check for non-responsive image patterns
  analyzeImages(content, lines, filePath, issues);

  // Check for hardcoded style objects with px values
  analyzeStyleObjects(content, lines, filePath, issues);

  // Check for responsive class usage (Tailwind specific)
  if (isTailwind) {
    analyzeTailwindResponsiveness(content, lines, filePath, issues);
  }

  return issues;
}

/**
 * Detect if the file uses Tailwind CSS classes
 */
function detectTailwindUsage(content) {
  const twPatterns = [
    /className\s*=\s*"[^"]*(?:flex|grid|p-|m-|w-|h-|text-|bg-|rounded)/,
    /class\s*=\s*"[^"]*(?:flex|grid|p-|m-|w-|h-|text-|bg-|rounded)/,
  ];
  return twPatterns.some((p) => p.test(content));
}

/**
 * Check for images without responsive handling
 */
function analyzeImages(content, lines, filePath, issues) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for <img> tags without responsive classes or styles
    const imgMatch = line.match(/<img\s/);
    if (imgMatch) {
      const hasResponsiveWidth =
        /(?:max-w|w-full|max-width|width:\s*100%|object-fit|object-cover)/.test(line);
      const hasResponsiveClass =
        /(?:responsive|fluid|img-fluid|w-full|max-w-full)/.test(line);

      if (!hasResponsiveWidth && !hasResponsiveClass) {
        issues.push({
          ruleId: "img-no-responsive",
          ruleName: "Non-Responsive Image",
          severity: "medium",
          category: "media",
          file: filePath,
          line: i + 1,
          column: imgMatch.index + 1,
          matchedText: "<img ...>",
          capturedValue: null,
          context: line.trim().substring(0, 120),
          suggestion:
            "Add w-full max-w-full or style with max-width: 100%; height: auto;",
          autoFixable: false,
          insideMediaQuery: false,
        });
      }
    }
  }
}

/**
 * Check for inline style objects with fixed px values
 */
function analyzeStyleObjects(content, lines, filePath, issues) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect style={{ width: 500, height: 400 }} or style={{ width: '500px' }}
    const styleObjMatch = line.match(/style\s*=\s*\{\s*\{/);
    if (styleObjMatch) {
      // Check for fixed pixel dimensions in the style object
      const widthMatch = line.match(/width\s*:\s*['"]?(\d{3,})(?:px)?['"]?/);
      if (widthMatch) {
        issues.push({
          ruleId: "inline-obj-fixed-width",
          ruleName: "Style Object Fixed Width",
          severity: "high",
          category: "layout",
          file: filePath,
          line: i + 1,
          column: widthMatch.index + 1,
          matchedText: widthMatch[0],
          capturedValue: widthMatch[1],
          context: line.trim().substring(0, 120),
          suggestion:
            "Use CSS classes or percentage values. Move to a responsive utility class.",
          autoFixable: false,
          insideMediaQuery: false,
        });
      }

      const heightMatch = line.match(/height\s*:\s*['"]?(\d{3,})(?:px)?['"]?/);
      if (heightMatch) {
        issues.push({
          ruleId: "inline-obj-fixed-height",
          ruleName: "Style Object Fixed Height",
          severity: "medium",
          category: "layout",
          file: filePath,
          line: i + 1,
          column: heightMatch.index + 1,
          matchedText: heightMatch[0],
          capturedValue: heightMatch[1],
          context: line.trim().substring(0, 120),
          suggestion:
            "Use min-height or auto. Move to a responsive utility class.",
          autoFixable: false,
          insideMediaQuery: false,
        });
      }
    }
  }
}

/**
 * Analyze Tailwind class lists for responsive pattern usage
 */
function analyzeTailwindResponsiveness(content, lines, filePath, issues) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const classMatch = line.match(/className\s*=\s*"([^"]*)"/);
    if (!classMatch) continue;

    const classes = classMatch[1];

    // Check for flex/grid without responsive stack
    if (/\bflex\b/.test(classes) && /\bflex-row\b/.test(classes)) {
      const hasResponsiveStack =
        /(?:sm:|md:|lg:|xl:)flex-col/.test(classes) ||
        /flex-col\s/.test(classes);

      if (!hasResponsiveStack) {
        issues.push({
          ruleId: "tw-flex-no-stack",
          ruleName: "Tailwind: Flex Row Without Mobile Stack",
          severity: "medium",
          category: "tailwind",
          file: filePath,
          line: i + 1,
          column: classMatch.index + 1,
          matchedText: "flex flex-row",
          capturedValue: null,
          context: line.trim().substring(0, 120),
          suggestion:
            "Use flex-col md:flex-row to stack on mobile, row on desktop",
          autoFixable: false,
          insideMediaQuery: false,
        });
      }
    }

    // Check for gap/padding with large fixed values but no responsive variant
    const bigGap = classes.match(/(?<!\w:)(?:gap|p|px|py|m|mx|my)-(\d{2,})\b/);
    if (bigGap) {
      const val = parseInt(bigGap[1]);
      if (val >= 12) {
        issues.push({
          ruleId: "tw-big-spacing-no-responsive",
          ruleName: "Tailwind: Large Spacing Without Responsive",
          severity: "low",
          category: "tailwind",
          file: filePath,
          line: i + 1,
          column: classMatch.index + 1,
          matchedText: bigGap[0],
          capturedValue: bigGap[1],
          context: line.trim().substring(0, 120),
          suggestion: `Consider: ${bigGap[0].replace(bigGap[1], Math.ceil(val/2).toString())} md:${bigGap[0]}`,
          autoFixable: false,
          insideMediaQuery: false,
        });
      }
    }
  }
}
