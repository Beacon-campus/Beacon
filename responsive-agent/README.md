# 🔍 Responsive Agent

An AI-powered CLI tool that scans frontend codebases, detects responsiveness issues, auto-fixes them, and generates detailed reports.

## Features

- **Framework Agnostic** — Works with React, Vue, Angular, Svelte, and plain HTML/CSS/JS
- **Pattern Detection** — Finds fixed widths, missing media queries, non-responsive images, and more
- **Auto-Fix** — Automatically converts `px` widths to `max-width`, font sizes to `rem`
- **Tailwind Analysis** — Detects missing responsive variants in Tailwind CSS classes
- **HTML Reports** — Beautiful dark-themed reports with severity scores
- **CLI Output** — Colorful terminal output with issue summaries

## Usage

```bash
# Install dependencies
npm install

# Analyze a codebase (defaults to current dir)
node bin/cli.js analyze ../client/src

# Auto-fix CSS issues
node bin/cli.js fix ../client/src

# Dry run (see what would be fixed)
node bin/cli.js fix ../client/src --dry-run

# Generate HTML report
node bin/cli.js report ../client/src -o report.html

# Analyze specific file types only
node bin/cli.js analyze ../client/src --include css,jsx

# Output as JSON
node bin/cli.js analyze ../client/src --json
```

## Detection Rules

| Rule | Severity | Auto-Fix |
|------|----------|----------|
| Fixed width in pixels (300px+) | 🔴 High | ✅ Yes |
| Missing media queries | 🔴 High | ❌ No |
| Missing viewport meta tag | 🔴 High | ✅ Yes |
| Non-responsive images | 🔴 High | ❌ No |
| Fixed height in pixels | 🟡 Medium | ✅ Yes |
| Font size in pixels | 🟡 Medium | ✅ Yes |
| Absolute positioning | 🟡 Medium | ❌ No |
| Tailwind: no responsive variants | 🟡 Medium | ❌ No |
| Flex row without mobile stack | 🟡 Medium | ❌ No |
| Large fixed spacing | 🟢 Low | ❌ No |
| Overflow hidden | 🟢 Low | ❌ No |
| Mixed breakpoint strategy | 🟢 Low | ❌ No |

## Report

The HTML report includes:
- Project framework & styling detection
- Severity breakdown with counts
- Responsiveness score (0–100%)
- Per-file issue listing with line numbers
- Auto-fix diff view (when using `fix` command)
