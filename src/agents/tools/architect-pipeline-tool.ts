import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";
import { jsonResult } from "./common.js";

const ArchitectPipelineToolSchema = Type.Object({
  action: Type.String({ description: "Action to perform in the architect pipeline" }),
  payload: Type.Optional(Type.Unknown({ description: "Action payload" })),
});

type ArchitectPipelineToolOptions = {
  workspaceDir?: string;
};

export function createArchitectPipelineTool(options?: ArchitectPipelineToolOptions): AnyAgentTool {
  void options;
  return {
    name: "architect_pipeline",
    label: "architect_pipeline",
    description: "Architect pipeline tool for multi-step design and planning workflows.",
    parameters: ArchitectPipelineToolSchema,
    async execute(_toolCallId: string, params: { action?: unknown; payload?: unknown }) {
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
