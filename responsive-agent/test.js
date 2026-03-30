import { runAnalysis } from './src/cli-core.js';
import { scanFiles } from './src/scanner.js';
import { generateHTMLReport } from './src/reporter/report.js';
import chalk from 'chalk';
import path from 'path';

async function generate() {
  const dir = "c:/Users/charan/Desktop/git practice/Final Project/client/src";
  const files = await scanFiles(dir);
  console.log(`Found ${files.length} files.`);
  
  // just check how many files it scans
}
generate();
