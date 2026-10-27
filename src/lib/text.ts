export function isChinese(text: string): boolean {
  return /[\u4E00-\u9FA5\uF900-\uFA2D]/.test(text);
}

const commentMarker = /^\s*(\/\*+|\*+\/|\*(?=\s|$)|\/\/+|#+(?=\s|$)|--(?=\s|$))/;

/**
 * 代码注释会被 //、#、* 等符号拆成很多行, 去掉注释符号后把同一段的行拼回去 (#24).
 * 只在每一行都以注释符号开头时处理, 普通文本原样返回.
 */
export function stripComment(text: string) {
  const lines = text.split("\n");
  if (!lines.filter((line) => line.trim()).every((line) => commentMarker.test(line))) {
    return text;
  }
  const paragraphs: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(commentMarker, "").replace(/\s*\*+\/\s*$/, "").trim();
    const prev = paragraphs[paragraphs.length - 1];
    if (!line) {
      // 空行分段
      if (prev) paragraphs.push("");
    } else if (prev && !/^([@\-+•]|\d+[.)]\s)/.test(line)) {
      // 同一段被换行切开的句子拼回去, 中文之间不加空格
      const cjk = /[\u4E00-\u9FA5]$/.test(prev) && /^[\u4E00-\u9FA5]/.test(line);
      paragraphs[paragraphs.length - 1] = prev + (cjk ? "" : " ") + line;
    } else {
      // JSDoc 标签和列表项另起一行
      paragraphs.push(line);
    }
  }
  return paragraphs.join("\n").trim();
}

/**
 * PDF 里一段话会按排版断成很多行, 选中后每行之间都是换行符, 直接翻译会被当成很多短句.
 * 把同一段的行拼回去: 行尾的断词连字符去掉后直接拼接; 以句号等结尾且明显短于其他行的
 * 视为段落结尾, 保留换行.
 */
export function joinPdfLines(text: string) {
  // 不少中文 PDF 选出来的是康熙部首等兼容字符 (如"⼀"), 换成对应的标准汉字
  text = text.replace(/[\u2E80-\u2FDF\uF900-\uFAFF]/g, (c) => c.normalize("NFKC"));
  return text.split(/\n\s*\n/).map((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const width = Math.max(...lines.map((line) => line.length));
    return lines.reduce((result, line, i) => {
      const prev = lines[i - 1] ?? "";
      if (i === 0) return line;
      if (/[.!?。！？:：]["”’)]?$/.test(prev) && prev.length < width * 0.8) {
        return `${result}\n${line}`;
      }
      if (/[a-z]-$/.test(prev) && /^[a-z]/.test(line)) return result.slice(0, -1) + line;
      return result + (isChinese(prev.slice(-1)) && isChinese(line.charAt(0)) ? "" : " ") + line;
    }, "");
  }).filter(Boolean).join("\n\n");
}
