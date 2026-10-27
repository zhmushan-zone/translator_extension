import { describe, expect, test } from "bun:test";
import { agentURL } from "../src/lib/engines";
import type { AgentConfig } from "../src/lib/types";

const url = (protocol: AgentConfig["protocol"], baseURL: string, api: "chat" | "models") =>
  agentURL({ protocol, baseURL, apiKey: "", model: "" }, api);

describe("agentURL", () => {
  test.each([
    ["只填域名时补 /v1", "https://api.deepseek.com", "https://api.deepseek.com/v1/chat/completions"],
    ["保留自带的路径", "https://ark.cn-beijing.volces.com/api/v3", "https://ark.cn-beijing.volces.com/api/v3/chat/completions"],
    ["去掉末尾斜杠", "https://openrouter.ai/api/v1/", "https://openrouter.ai/api/v1/chat/completions"],
    ["填了完整接口地址", "https://api.deepseek.com/v1/chat/completions", "https://api.deepseek.com/v1/chat/completions"],
    ["本地 Ollama", "http://localhost:11434", "http://localhost:11434/v1/chat/completions"],
  ])("OpenAI 兼容: %s", (_, baseURL, expected) => {
    expect(url("openai", baseURL, "chat")).toBe(expected);
  });

  test("OpenAI 兼容: 模型列表", () => {
    expect(url("openai", "https://api.deepseek.com", "models")).toBe("https://api.deepseek.com/v1/models");
  });

  test.each([
    ["官方地址", "https://api.anthropic.com", "https://api.anthropic.com/v1/messages"],
    ["填了 /v1", "https://api.anthropic.com/v1", "https://api.anthropic.com/v1/messages"],
    ["第三方兼容网关", "https://api.deepseek.com/anthropic/", "https://api.deepseek.com/anthropic/v1/messages"],
  ])("Anthropic: %s", (_, baseURL, expected) => {
    expect(url("anthropic", baseURL, "chat")).toBe(expected);
  });

  test("Anthropic: 模型列表一次取完", () => {
    expect(url("anthropic", "https://api.anthropic.com", "models")).toBe("https://api.anthropic.com/v1/models?limit=1000");
  });
});
