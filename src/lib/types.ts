export type Lang = "zh" | "en";

export type EngineId = "volcengine" | "transmart" | "bing" | "agent";

export interface AgentConfig {
  protocol: "openai" | "anthropic";
  baseURL: string;
  apiKey: string;
  model: string;
}

export type TestResult =
  | { ok: true; ms: number; result: string }
  | { ok: false; error: string };

export type ModelsResult =
  | { ok: true; models: string[] }
  | { ok: false; error: string };

/**
 * content script、popup、设置页发给 background 的消息, 以及各自的返回值.
 */
export type Message =
  | { type: "check" }
  | { type: "toggleGlobal" }
  | { type: "ui" }
  | { type: "translate"; text: string; from: Lang; to: Lang }
  | { type: "test"; engine: EngineId; config?: AgentConfig }
  | { type: "models"; config: AgentConfig };

export interface Responses {
  check: boolean;
  toggleGlobal: void;
  ui: boolean;
  translate: string;
  test: TestResult;
  models: ModelsResult;
}

/**
 * background 发给页面里 content script 的消息.
 */
export type TabMessage = { type: "tip"; on: boolean } | { type: "contentType" };

export function send<M extends Message>(message: M): Promise<Responses[M["type"]]> {
  return chrome.runtime.sendMessage(message);
}
