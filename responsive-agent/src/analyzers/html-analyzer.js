// ============================================================
// RESPONSIVE AGENT — HTML Analyzer
// ============================================================

/**
 * Analyze HTML files for responsiveness issues
 */
export function analyzeHTMLFile(content, filePath) {
  const issues = [];
  const lines = content.split("\n");

  // 1. Missing viewport meta tag
  if (!/<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(content)) {
    issues.push({
      ruleId: "missing-viewport",
      ruleName: "Missing Viewport Meta Tag",
      severity: "high",
      category: "meta",
      file: filePath,
      line: 1,
      column: 1,
      matchedText: "(missing)",
      capturedValue: null,
      context: "No <meta name=\"viewport\"> found in this HTML file",
      suggestion: 'Add: <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      autoFixable: true,
      insideMediaQuery: false,
    });
  }

  // 2. Tables without responsive wrapper
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/<table[\s>]/i.test(line)) {
      // Check if the table has a responsive wrapper (within ~3 lines above)
      const prevLines = lines.slice(Math.max(0, i - 3), i).join(" ");
      const hasWrapper = /overflow-(?:x-)?auto|overflow-(?:x-)?scroll|table-responsive|responsive/.test(prevLines);

      if (!hasWrapper) {
        issues.push({
          ruleId: "table-no-responsive",
          ruleName: "Table Without Responsive Wrapper",
          severity: "medium",
          category: "layout",
          file: filePath,
          line: i + 1,
          column: 1,
          matchedText: "<table>",
          capturedValue: null,
          context: line.trim().substring(0, 120),
          suggestion: "Wrap tables in a div with overflow-x: auto for horizontal scrolling on mobile",
          autoFixable: false,
          insideMediaQuery: false,
        });
      }
    }

    // 3. Fixed-width attributes on elements
    const widthAttr = line.match(/\bwidth\s*=\s*["']?(\d{3,})["']?/i);
    if (widthAttr) {
      issues.push({
        ruleId: "html-attr-fixed-width",
        ruleName: "HTML Width Attribute",
        severity: "high",
        category: "layout",
        file: filePath,
        line: i + 1,
        column: widthAttr.index + 1,
        matchedText: widthAttr[0],
        capturedValue: widthAttr[1],
        context: line.trim().substring(0, 120),
        suggestion: "Remove width attribute and use CSS: max-width: 100%; width: auto;",
        autoFixable: false,
        insideMediaQuery: false,
      });
    }

    // 4. Inline styles with non-responsive values
    const inlineStyle = line.match(/style\s*=\s*"([^"]*)"/i);
    if (inlineStyle) {
      const styleVal = inlineStyle[1];
      const fixedWidth = styleVal.match(/width\s*:\s*(\d{3,})px/);
      if (fixedWidth) {
        issues.push({
          ruleId: "html-inline-fixed-width",
          ruleName: "HTML Inline Fixed Width",
          severity: "high",
          category: "layout",
          file: filePath,
          line: i + 1,
          column: inlineStyle.index + 1,
          matchedText: fixedWidth[0],
          capturedValue: fixedWidth[1],
          context: line.trim().substring(0, 120),
          suggestion: "Use CSS classes with responsive values instead",
          autoFixable: false,
          insideMediaQuery: false,
        });
      }
    }
  }

  return issues;
}
