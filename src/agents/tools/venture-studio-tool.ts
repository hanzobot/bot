import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const VentureStudioToolSchema = Type.Object({
  action: Type.String({ description: "Action to perform" }),
  query: Type.Optional(Type.String({ description: "Query or input for the action" })),
});

type VentureStudioToolOptions = {
  workspaceDir?: string;
};

export function createVentureStudioTool(options?: VentureStudioToolOptions): AnyAgentTool {
  void options;
  return {
    name: "venture_studio",
    label: "venture_studio",
    description: "Venture studio tool for project and business analysis.",
    parameters: VentureStudioToolSchema,
    async execute(_toolCallId: string, params: { action?: unknown; query?: unknown }) {
      const action = (
        typeof params.action === "string" ? params.action : JSON.stringify(params.action ?? "")
      ).trim();
      if (!action) {
        return jsonResult({ error: "action is required" });
      }
      return jsonResult({ action, status: "ok" });
    },
  };
}
