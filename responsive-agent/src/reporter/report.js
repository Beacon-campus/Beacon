// ============================================================
// RESPONSIVE AGENT — Report Generator
// ============================================================

import { writeFile } from "node:fs/promises";
import { SEVERITY_ORDER, SEVERITY_EMOJI } from "../rules/patterns.js";

/**
 * Generate a rich HTML report from analysis results
 */
export async function generateHTMLReport(results, outputPath) {
  const { framework, stats, issues, fixes } = results;

  const sortedIssues = [...issues].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] || 2) - (SEVERITY_ORDER[b.severity] || 2)
  );

  const highCount = issues.filter((i) => i.severity === "high").length;
  const mediumCount = issues.filter((i) => i.severity === "medium").length;
  const lowCount = issues.filter((i) => i.severity === "low").length;
  const fixableCount = issues.filter((i) => i.autoFixable).length;

  // Group issues by file
  const byFile = {};
  for (const issue of sortedIssues) {
    const key = issue.file;
    if (!byFile[key]) byFile[key] = [];
    byFile[key].push(issue);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Responsive Agent — Analysis Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0f172a; color: #e2e8f0; line-height: 1.6;
    }
    .container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }

    /* Header */
    .header {
      text-align: center; margin-bottom: 48px;
      background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.15));
      border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
      padding: 48px 32px;
    }
    .header h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 8px; }
    .header h1 span { background: linear-gradient(135deg, #818cf8, #34d399);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header p { color: #94a3b8; font-size: 1.1rem; }
    .header .meta { display: flex; gap: 24px; justify-content: center; margin-top: 20px;
      flex-wrap: wrap; }
    .header .meta-item { background: rgba(255,255,255,0.05); border-radius: 12px;
      padding: 12px 20px; font-size: 0.9rem; }
    .meta-label { color: #64748b; font-size: 0.75rem; text-transform: uppercase;
      letter-spacing: 0.05em; }

    /* Stats Cards */
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px; margin-bottom: 40px; }
    .stat-card {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px; padding: 24px; text-align: center;
    }
    .stat-number { font-size: 2.5rem; font-weight: 800; }
    .stat-label { color: #94a3b8; font-size: 0.85rem; margin-top: 4px; }
    .stat-high { color: #f87171; } .stat-medium { color: #fbbf24; }
    .stat-low { color: #34d399; } .stat-fix { color: #818cf8; }

    /* Score */
    .score-section { text-align: center; margin-bottom: 40px; }
    .score-bar { width: 100%; height: 12px; background: #1e293b; border-radius: 8px;
      overflow: hidden; margin: 16px 0; }
    .score-fill { height: 100%; border-radius: 8px; transition: width 0.8s ease; }
    .score-label { font-size: 1.4rem; font-weight: 700; }

    /* File Groups */
    .file-group { margin-bottom: 32px; }
    .file-header {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px 12px 0 0; padding: 16px 20px;
      font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 0.85rem;
      color: #818cf8; display: flex; justify-content: space-between; align-items: center;
    }
    .file-count { background: rgba(255,255,255,0.08); border-radius: 8px;
      padding: 4px 10px; font-size: 0.75rem; color: #94a3b8; }

    /* Issues */
    .issue {
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
      border-top: none; padding: 16px 20px; display: flex; gap: 16px; align-items: flex-start;
    }
    .issue:last-child { border-radius: 0 0 12px 12px; }
    .issue-severity { font-size: 1.2rem; flex-shrink: 0; margin-top: 2px; }
    .issue-body { flex: 1; min-width: 0; }
    .issue-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 4px; }
    .issue-location { color: #64748b; font-size: 0.8rem;
      font-family: 'Cascadia Code', monospace; margin-bottom: 6px; }
    .issue-context { background: #1e293b; border-radius: 8px; padding: 8px 12px;
      font-family: 'Cascadia Code', monospace; font-size: 0.8rem; color: #94a3b8;
      overflow-x: auto; margin-bottom: 8px; white-space: pre; }
    .issue-suggestion { color: #34d399; font-size: 0.85rem; }
    .issue-suggestion::before { content: "💡 "; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px;
      font-size: 0.7rem; font-weight: 600; margin-left: 8px; }
    .badge-fixable { background: rgba(129,140,248,0.2); color: #818cf8; }

    /* Footer */
    .footer { text-align: center; color: #475569; font-size: 0.85rem;
      margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); }

    @media (max-width: 640px) {
      .header h1 { font-size: 1.8rem; }
      .stats { grid-template-columns: repeat(2, 1fr); }
      .header .meta { flex-direction: column; align-items: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 <span>Responsive Agent</span></h1>
      <p>Automated Responsiveness Analysis Report</p>
      <div class="meta">
        <div class="meta-item">
          <div class="meta-label">Framework</div>
          <div>${framework.name}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Styling</div>
          <div>${framework.styling.length ? framework.styling.join(", ") : "Vanilla CSS"}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Files Scanned</div>
          <div>${stats.totalFiles}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Generated</div>
          <div>${new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">${issues.length}</div>
        <div class="stat-label">Total Issues</div>
      </div>
      <div class="stat-card">
        <div class="stat-number stat-high">${highCount}</div>
        <div class="stat-label">🔴 High Severity</div>
      </div>
      <div class="stat-card">
        <div class="stat-number stat-medium">${mediumCount}</div>
        <div class="stat-label">🟡 Medium Severity</div>
      </div>
      <div class="stat-card">
        <div class="stat-number stat-low">${lowCount}</div>
        <div class="stat-label">🟢 Low Severity</div>
      </div>
      <div class="stat-card">
        <div class="stat-number stat-fix">${fixableCount}</div>
        <div class="stat-label">⚙️ Auto-Fixable</div>
      </div>
    </div>

    <div class="score-section">
      <div class="score-label">Responsiveness Score: ${calcScore(issues, stats)}%</div>
      <div class="score-bar">
        <div class="score-fill" style="width: ${calcScore(issues, stats)}%;
          background: linear-gradient(90deg,
            ${calcScore(issues, stats) > 70 ? "#34d399" : calcScore(issues, stats) > 40 ? "#fbbf24" : "#f87171"},
            ${calcScore(issues, stats) > 70 ? "#818cf8" : calcScore(issues, stats) > 40 ? "#f59e0b" : "#dc2626"});">
        </div>
      </div>
    </div>

    ${Object.entries(byFile)
      .map(
        ([file, fileIssues]) => `
      <div class="file-group">
        <div class="file-header">
          <span>${escapeHtml(file)}</span>
          <span class="file-count">${fileIssues.length} issue${fileIssues.length === 1 ? "" : "s"}</span>
        </div>
        ${fileIssues
          .map(
            (issue) => `
          <div class="issue">
            <div class="issue-severity">${SEVERITY_EMOJI[issue.severity] || "⚪"}</div>
            <div class="issue-body">
              <div class="issue-title">
                ${escapeHtml(issue.ruleName)}
                ${issue.autoFixable ? '<span class="badge badge-fixable">Auto-fixable</span>' : ""}
              </div>
              <div class="issue-location">Line ${issue.line}${issue.column > 1 ? `:${issue.column}` : ""} — ${escapeHtml(issue.matchedText)}</div>
              <div class="issue-context">${escapeHtml(issue.context)}</div>
              <div class="issue-suggestion">${escapeHtml(issue.suggestion)}</div>
            </div>
          </div>`
          )
          .join("")}
      </div>`
      )
      .join("")}

    ${fixes && fixes.length > 0 ? `
    <h2 style="margin: 40px 0 20px; font-size: 1.5rem;">⚙️ Auto-Fixes Applied</h2>
    ${fixes.map(f => `<div class="issue" style="border: 1px solid rgba(129,140,248,0.2);">
      <div class="issue-severity">✅</div>
      <div class="issue-body">
        <div class="issue-title">${escapeHtml(f.ruleId)}</div>
        <div class="issue-context" style="color: #f87171; text-decoration: line-through;">${escapeHtml(f.original)}</div>
        <div class="issue-context" style="color: #34d399;">${escapeHtml(f.replacement)}</div>
      </div>
    </div>`).join("")}
    ` : ""}

    <div class="footer">
      <p>Generated by <strong>Responsive Agent</strong> • ${new Date().toLocaleDateString()}</p>
    </div>
  </div>
</body>
</html>`;

  await writeFile(outputPath, html, "utf-8");
  return outputPath;
}

/**
 * Print console report
 */
export function printConsoleReport(results, chalk) {
  const { framework, stats, issues } = results;
  const hr = "─".repeat(60);

  console.log();
  console.log(chalk.bold.cyan("  🔍 RESPONSIVE AGENT — Analysis Results"));
  console.log(chalk.gray(`  ${hr}`));
  console.log();

  // Project info
  console.log(chalk.white("  📦 Framework:  ") + chalk.yellow(framework.name));
  console.log(chalk.white("  🎨 Styling:    ") + chalk.yellow(framework.styling.join(", ") || "Vanilla CSS"));
  console.log(chalk.white("  📁 Files:      ") + chalk.yellow(stats.totalFiles));
  console.log();

  // Severity breakdown
  const high = issues.filter((i) => i.severity === "high").length;
  const med = issues.filter((i) => i.severity === "medium").length;
  const low = issues.filter((i) => i.severity === "low").length;
  const fixable = issues.filter((i) => i.autoFixable).length;

  console.log(chalk.bold("  Summary:"));
  console.log(`  ${chalk.red("🔴 High:")} ${high}    ${chalk.yellow("🟡 Medium:")} ${med}    ${chalk.green("🟢 Low:")} ${low}    ${chalk.magenta("⚙️  Fixable:")} ${fixable}`);
  console.log();

  // Score
  const score = calcScore(issues, stats);
  const scoreColor = score > 70 ? chalk.green : score > 40 ? chalk.yellow : chalk.red;
  console.log(chalk.bold(`  📊 Responsiveness Score: ${scoreColor(score + "%")}`));
  console.log();

  // Group by file
  const byFile = {};
  for (const issue of issues) {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  }

  // Sort issues: high first
  const sortedIssues = [...issues].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] || 2) - (SEVERITY_ORDER[b.severity] || 2)
  );

  // Show top 20 issues
  console.log(chalk.gray(`  ${hr}`));
  console.log(chalk.bold(`  Top Issues (${Math.min(sortedIssues.length, 20)} of ${sortedIssues.length}):`));
  console.log();

  for (const issue of sortedIssues.slice(0, 20)) {
    const icon =
      issue.severity === "high" ? chalk.red("🔴") :
      issue.severity === "medium" ? chalk.yellow("🟡") : chalk.green("🟢");

    console.log(`  ${icon} ${chalk.bold(issue.ruleName)}`);
    console.log(chalk.gray(`     ${issue.file}:${issue.line}`));
    console.log(chalk.dim(`     ${issue.context.substring(0, 100)}`));
    console.log(chalk.cyan(`     💡 ${issue.suggestion}`));
    console.log();
  }

  if (sortedIssues.length > 20) {
    console.log(chalk.gray(`  ... and ${sortedIssues.length - 20} more issues. Generate an HTML report for full details.`));
    console.log();
  }

  console.log(chalk.gray(`  ${hr}`));
}

function calcScore(issues, stats) {
  if (stats.totalFiles === 0) return 100;
  const weights = { high: 10, medium: 4, low: 1 };
  const totalPenalty = issues.reduce((sum, i) => sum + (weights[i.severity] || 0), 0);
  const maxPenalty = stats.totalFiles * 15; // rough max per file
  const score = Math.max(0, Math.round(100 - (totalPenalty / maxPenalty) * 100));
  return Math.min(100, score);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
