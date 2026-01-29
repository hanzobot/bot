import { describe, expect, it } from "vitest";

import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "bot", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "bot", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "bot", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "bot", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "bot", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "bot", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "bot", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "bot"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "bot", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "bot", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "bot", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "bot", "status", "--timeout=2500"], "--timeout")).toBe(
      "2500",
    );
    expect(getFlagValue(["node", "bot", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "bot", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "bot", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "bot", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "bot", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "bot", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "bot", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "bot", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "bot", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "bot", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "bot",
      rawArgs: ["node", "bot", "status"],
    });
    expect(nodeArgv).toEqual(["node", "bot", "status"]);

    const directArgv = buildParseArgv({
      programName: "bot",
      rawArgs: ["bot", "status"],
    });
    expect(directArgv).toEqual(["node", "bot", "status"]);

    const bunArgv = buildParseArgv({
      programName: "bot",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "bot",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "bot", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "bot", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "bot", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "bot", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "bot", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "bot", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "bot", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "bot", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
