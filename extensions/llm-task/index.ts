import type { BotPluginApi } from "../../src/plugins/types.js";

import { createLlmTaskTool } from "./src/llm-task-tool.js";

export default function register(api: BotPluginApi) {
  api.registerTool(createLlmTaskTool(api), { optional: true });
}
