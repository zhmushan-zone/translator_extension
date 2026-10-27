import { describe, expect, test } from "bun:test";
import { joinPdfLines, stripComment } from "../src/lib/text";

describe("stripComment (#24)", () => {
  test.each([
    [
      "块注释",
      "/**\n * This comment is quite long\n * so I need to break it up into\n * multiple lines.\n **/",
      "This comment is quite long so I need to break it up into multiple lines.",
    ],
    [
      "行注释",
      "// This comment is quite long\n// so I need to break it up into\n// multiple lines.",
      "This comment is quite long so I need to break it up into multiple lines.",
    ],
    [
      "缩进、空行分段、JSDoc 标签",
      "    /**\n     * Returns the sum\n     * of two numbers.\n     *\n     * @param a first\n     * @param b second\n     */",
      "Returns the sum of two numbers.\n\n@param a first\n@param b second",
    ],
    ["中文之间不加空格", "// 这是一段很长的注释\n// 所以拆成了两行", "这是一段很长的注释所以拆成了两行"],
    ["# 注释", "# Read the config file\n# and return a dict.", "Read the config file and return a dict."],
  ])("%s", (_, input, expected) => {
    expect(stripComment(input)).toBe(expected);
  });

  test.each([
    ["普通段落", "Hello world.\nThis is normal text."],
    ["列表", "- first item\n- second item"],
    ["#include", "#include <stdio.h>\n#define X 1"],
    ["混有代码", "// set x\nconst x = 1;"],
  ])("%s不处理", (_, input) => {
    expect(stripComment(input)).toBe(input);
  });
});

describe("joinPdfLines (#12)", () => {
  test.each([
    [
      "同一段的行拼回去",
      "Machine translation has improved dramatically over the past\ndecade, driven by large neural networks trained on parallel corpora.\nHowever, translating scientific documents still poses unique\nchallenges for readers.",
      "Machine translation has improved dramatically over the past decade, driven by large neural networks trained on parallel corpora. However, translating scientific documents still poses unique challenges for readers.",
    ],
    ["去掉断词连字符", "translating scientific docu-\nments is hard", "translating scientific documents is hard"],
    [
      "短的句末行视为段落结尾",
      "The first paragraph ends here with a long line of text.\nShort end.\nSecond paragraph starts on this line.",
      "The first paragraph ends here with a long line of text. Short end.\nSecond paragraph starts on this line.",
    ],
    [
      "中文拼接不加空格",
      "划词翻译是一个非常方便的浏览器插件，可以帮助你快\n速阅读外文网页。",
      "划词翻译是一个非常方便的浏览器插件，可以帮助你快速阅读外文网页。",
    ],
    ["空行保留分段", "Para one.\n\nPara two.", "Para one.\n\nPara two."],
    [
      "康熙部首换成标准汉字",
      "⼀个⾮常⽅便的浏览器插件，可以帮助你阅读外⽂⽹\n页。",
      "一个非常方便的浏览器插件，可以帮助你阅读外文网页。",
    ],
  ])("%s", (_, input, expected) => {
    expect(joinPdfLines(input)).toBe(expected);
  });
});
