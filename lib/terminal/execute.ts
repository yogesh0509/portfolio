import { matchNative } from "./commands/run";
import { findProject } from "./commands/shared";
import { parseCommand } from "./parse";
import { findCommand, visibleNames } from "./registry";
import { closest } from "./suggest";
import { cmd, error } from "./text";
import type { Env, Line, Result, Session } from "./types";

/**
 * Runs one command line. Commands are matched case-insensitively. A line that is not a command
 * but names a project ("haystack") or is a close typo gets a suggestion instead of a bare error.
 */
export async function execute(input: string, session: Session, env: Env): Promise<Result> {
  const trimmed = input.trim();
  if (trimmed === "") return { lines: [] };

  const native = matchNative(trimmed, session.cwd, env.data);
  if (native) return native;

  const parsed = parseCommand(trimmed);
  if (!parsed) return { lines: [] };

  const command = findCommand(parsed.name);
  if (!command) return unknown(parsed.name, env);

  try {
    return await command.run(parsed.args, session, env);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return { lines: [error(`${command.name}: ${reason}`)], status: 1 };
  }
}

function unknown(name: string, env: Env): Result {
  const lines: Line[] = [error(`bash: ${name}: command not found`)];
  const project = findProject(env.data, name);
  const guess = closest(name, visibleNames());
  if (project) lines.push([{ text: "Did you mean " }, cmd(project.live || project.local ? `run ${project.slug}` : `cd ~${project.path}`), { text: "?" }]);
  else if (guess) lines.push([{ text: "Did you mean " }, cmd(guess), { text: "?" }]);
  else lines.push([{ text: "Type " }, cmd("help"), { text: " to see what is available." }]);
  return { lines, status: 127 };
}
