#!/usr/bin/env node
// ============================================================
// RESPONSIVE AGENT — CLI Entry Point
// ============================================================

import { Command } from "commander";
import chalk from "chalk";
import { resolve, extname } from "node:path";
import { scanFiles, detectFramework, readFileContent, getProjectStats } from "../src/scanner.js";
import { analyzeCSSFile } from "../src/analyzers/css-analyzer.js";
import { analyzeComponentFile } from "../src/analyzers/jsx-analyzer.js";
import { analyzeHTMLFile } from "../src/analyzers/html-analyzer.js";
import { fixCSSFile } from "../src/fixers/css-fixer.js";
import { generateHTMLReport, printConsoleReport } from "../src/reporter/report.js";

const program = new Command();

program
  .name("responsive-agent")
  .description("🔍 AI Agent that analyzes frontend codebases and fixes responsiveness issues")
  .version("1.0.0");

// ======================== ANALYZE COMMAND ========================
program
  .command("analyze")
  .description("Analyze a codebase for responsiveness issues")
  .argument("[dir]", "Directory to scan", ".")
  .option("--include <exts>", "Only include specific extensions (comma-separated)", "")
  .option("--report <path>", "Generate HTML report at this path")
  .option("--json", "Output results as JSON")
  .action(async (dir, opts) => {
    const targetDir = resolve(dir);
    console.log();
    console.log(chalk.bold.cyan("  🔍 Responsive Agent — Analyzing..."));
    console.log(chalk.gray(`  Target: ${targetDir}`));
    console.log();

    const results = await runAnalysis(targetDir, opts);

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    printConsoleReport(results, chalk);

    if (opts.report) {
      const reportPath = resolve(opts.report);
      await generateHTMLReport(results, reportPath);
      console.log(chalk.green(`  ✅ HTML report saved to: ${reportPath}`));
      console.log();
    }
  });

// ======================== FIX COMMAND ========================
program
  .command("fix")
  .description("Auto-fix responsiveness issues (CSS files)")
  .argument("[dir]", "Directory to scan", ".")
  .option("--dry-run", "Show what would be fixed without modifying files")
  .option("--report <path>", "Generate HTML report at this path")
  .action(async (dir, opts) => {
    const targetDir = resolve(dir);
    console.log();
    console.log(chalk.bold.magenta("  ⚙️  Responsive Agent — Fixing..."));
    console.log(chalk.gray(`  Target: ${targetDir}`));
    if (opts.dryRun) console.log(chalk.yellow("  Mode: Dry Run (no files will be modified)"));
    console.log();

    // First analyze
    const results = await runAnalysis(targetDir, opts);

    // Then fix CSS files
    const files = await scanFiles(targetDir);
    const cssFiles = files.filter((f) => [".css", ".scss", ".less"].includes(f.extension));
    const allFixes = [];

    for (const file of cssFiles) {
      const { fixes, fixCount } = await fixCSSFile(file.path, opts.dryRun);
      if (fixCount > 0) {
        console.log(
          chalk.green(`  ✅ ${file.relativePath}: ${fixCount} fix${fixCount === 1 ? "" : "es"} ${opts.dryRun ? "(dry run)" : "applied"}`)
        );
        allFixes.push(...fixes.map((f) => ({ ...f, file: file.relativePath })));
      }
    }

    if (allFixes.length === 0) {
      console.log(chalk.yellow("  No auto-fixable issues found in CSS files."));
    } else {
      console.log();
      console.log(chalk.bold(`  Total: ${allFixes.length} fix${allFixes.length === 1 ? "" : "es"} ${opts.dryRun ? "would be" : ""} applied`));

      // Show what was fixed
      console.log();
      for (const fix of allFixes) {
        console.log(chalk.gray(`  ${fix.file}:${fix.line}`));
        console.log(chalk.red(`    - ${fix.original}`));
        console.log(chalk.green(`    + ${fix.replacement}`));
        console.log();
      }
    }

    results.fixes = allFixes;

    if (opts.report) {
      const reportPath = resolve(opts.report);
      await generateHTMLReport(results, reportPath);
      console.log(chalk.green(`  ✅ HTML report saved to: ${reportPath}`));
    }

    console.log();
  });

// ======================== REPORT COMMAND ========================
program
  .command("report")
  .description("Generate a detailed HTML report")
  .argument("[dir]", "Directory to scan", ".")
  .option("-o, --output <path>", "Output file path", "responsive-report.html")
  .action(async (dir, opts) => {
    const targetDir = resolve(dir);
    console.log();
    console.log(chalk.bold.cyan("  📊 Responsive Agent — Generating Report..."));
    console.log(chalk.gray(`  Target: ${targetDir}`));
    console.log();

    const results = await runAnalysis(targetDir, {});
    const reportPath = resolve(opts.output);
    await generateHTMLReport(results, reportPath);

    printConsoleReport(results, chalk);
    console.log(chalk.green.bold(`  ✅ HTML report saved to: ${reportPath}`));
    console.log(chalk.gray(`  Open it in your browser to view the full interactive report.`));
    console.log();
  });

// ======================== CORE ANALYSIS ENGINE ========================
async function runAnalysis(dir, opts) {
  // Step 1: Detect framework
  const framework = await detectFramework(dir);

  // Step 2: Scan files
  let files = await scanFiles(dir);

  // Filter by extension if specified
  if (opts.include) {
    const allowed = opts.include.split(",").map((e) => (e.startsWith(".") ? e : `.${e}`));
    files = files.filter((f) => allowed.includes(f.extension));
  }

  const stats = getProjectStats(files);

  // Progress tracking
  const total = files.length;
  let processed = 0;

  // Step 3: Analyze each file
  const allIssues = [];

  for (const file of files) {
    processed++;
    const pct = Math.round((processed / total) * 100);
    process.stdout.write(`\r  Scanning... ${pct}% (${processed}/${total}) ${chalk.gray(file.relativePath.substring(0, 50))}${"".padEnd(30)}`);

    const content = await readFileContent(file.path);
    if (!content) continue;

    let issues = [];

    switch (file.extension) {
      case ".css":
      case ".scss":
      case ".less":
        issues = analyzeCSSFile(content, file.relativePath);
        break;
      case ".jsx":
      case ".tsx":
      case ".vue":
      case ".svelte":
        issues = analyzeComponentFile(content, file.relativePath);
        break;
      case ".html":
      case ".htm":
        issues = [
          ...analyzeHTMLFile(content, file.relativePath),
          ...analyzeCSSFile(content, file.relativePath), // inline <style> blocks
        ];
        break;
      case ".js":
      case ".ts":
        // Only analyze if it contains JSX-like content or style objects
        if (/(?:className|style\s*=|css`|styled\.)/.test(content)) {
          issues = analyzeComponentFile(content, file.relativePath);
        }
        break;
    }

    // Filter out issues inside media queries (they're already responsive)
    issues = issues.filter((i) => !i.insideMediaQuery);

    allIssues.push(...issues);
  }

  // Clear the progress line
  process.stdout.write("\r" + " ".repeat(100) + "\r");

  return {
    framework,
    stats,
    issues: allIssues,
    fixes: [],
  };
}

program.parse();
