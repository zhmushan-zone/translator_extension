/**
 * background, popup 和 options 之间共享的类型.
 */
type Lang = "zh" | "en";

type EngineId = "volcengine" | "transmart" | "bing" | "agent";

interface AgentConfig {
  protocol: "openai" | "anthropic";
  baseURL: string;
  apiKey: string;
  model: string;
}

type TestResult =
  | { ok: true; ms: number; result: string }
  | { ok: false; error: string };

type ModelsResult =
  | { ok: true; models: string[] }
  | { ok: false; error: string };
