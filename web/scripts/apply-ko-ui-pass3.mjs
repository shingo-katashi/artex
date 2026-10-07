/** Pass 3: tasks page + mixed strings */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src");
const R = [
  ["【파일 업로드（绝对路径）】", "【파일 업로드(절대 경로)】"],
  ["삭제资产", "삭제된 자산"],
  ["解除共享资产关联", "공유 자산 연결 해제"],
  ["삭제작업文件", "작업 파일 삭제"],
  ["삭제漏洞", "삭제된 취약점"],
  ["삭제 LLM 请求/响应记录", "삭제된 LLM 요청/응답 기록"],
  ["작업已삭제", "작업이 삭제되었습니다"],
  ["已继续", "재개됨"],
  ["已进入队列", "대기열에 들어갔습니다"],
  ["暂停", "일시정지"],
  ["继续", "재개"],
  ["已重命名", "이름이 변경되었습니다"],
  ["归档", "보관"],
  ["归档실패", "보관 실패"],
  ["已归档", "보관됨"],
  ["未分类", "미분류"],
  ["전체分类", "전체 분류"],
  ["작업分类", "작업 분류"],
  ["清除검색", "검색 지우기"],
  ["선택本页전체작업", "이 페이지의 모든 작업 선택"],
  ["批量暂停", "일괄 일시정지"],
  ["批量继续", "일괄 재개"],
  ["修改分类실패", "분류 변경 실패"],
  ["一次最多", "한 번에 최대"],
  ["运行时长", "실행 시간"],
  ["绝对路径", "절대 경로"],
  ["分类", "분류"],
  ["归档队列", "보관 대기열"],
  ["等", " 외"],
].sort((a, b) => b[0].length - a[0].length);

function walk(d, f = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, f);
    else if (/\.(tsx?|mjs)$/.test(e.name)) f.push(p);
  }
  return f;
}
let n = 0;
for (const file of walk(SRC)) {
  let s = fs.readFileSync(file, "utf8");
  if (!/[\u4e00-\u9fff]/.test(s)) continue;
  const o = s;
  for (const [a, b] of R) s = s.replaceAll(a, b);
  if (s !== o) {
    fs.writeFileSync(file, s);
    n++;
  }
}
console.log("pass3 updated", n);
