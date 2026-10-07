// Remove Han from line and block comments in .tsx/.ts (dev comments → Latin/KO only).
import fs from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..", "src");
const HAN = /[\u4e00-\u9fff]/g;

function stripCommentText(s) {
  return s.replace(HAN, "").replace(/\s{2,}/g, " ").trimEnd();
}

function processFile(text) {
  const lines = text.split("\n");
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (inBlock) {
      if (HAN.test(line)) line = stripCommentText(line);
      if (line.includes("*/")) inBlock = false;
      lines[i] = line;
      continue;
    }
    if (/^\s*\/\*/.test(line)) {
      inBlock = !line.includes("*/");
      if (HAN.test(line)) lines[i] = stripCommentText(line);
      continue;
    }
    if (/^\s*\/\//.test(line) && HAN.test(line)) {
      lines[i] = stripCommentText(line);
    }
  }
  return lines.join("\n");
}

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(name) && !name.includes(".test.")) acc.push(p);
  }
  return acc;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const orig = fs.readFileSync(file, "utf8");
  const next = processFile(orig);
  if (next !== orig) {
    fs.writeFileSync(file, next);
    changed++;
  }
}
console.log(`strip-han-from-comments: ${changed} files updated`);
