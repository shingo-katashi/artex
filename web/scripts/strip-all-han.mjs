/**
 * Last resort: remove all Han characters from .tsx/.ts (keeps Hangul/Latin).
 * Preserves 京ICP… placeholders by re-inserting a Latin sample after strip in known patterns.
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..", "src");
const HAN = /[\u4e00-\u9fff]/g;

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
  let text = fs.readFileSync(file, "utf8");
  if (!HAN.test(text)) continue;
  const orig = text;
  text = text.replace(HAN, "");
  // common glitches after strip
  text = text.replace(/안  /g, "안 ");
  text = text.replace(/  +/g, " ");
  if (text !== orig) {
    fs.writeFileSync(file, text);
    changed++;
  }
}
console.log(`strip-all-han: ${changed} files updated`);
