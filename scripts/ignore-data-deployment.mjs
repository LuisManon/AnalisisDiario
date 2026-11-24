import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function onlyRuntimeData(files) {
  const direct = new Set(["data/results.json", "data/la-primera-results.json", "data/super-kino-results.json", "data/portfolio-history.json"]);
  return files.length > 0 && files.every(file => direct.has(file) || /^data\/(super-kino-portfolios|super-kino-neighbor-portfolios|quinielon-assignments|public-portfolios)\/[\w.-]+\.json$/.test(file));
}

export function shouldSkipDeployment(env = process.env, git = args => execFileSync("git", args, { encoding: "utf8" })) {
  const previous = env.VERCEL_GIT_PREVIOUS_SHA;
  // No trusted deployed base, missing history, or preview: build conservatively.
  if (env.VERCEL_ENV !== "production" || !previous || !/^[a-f0-9]{40}$/.test(previous) || !env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) return false;
  try {
    if (git(["diff", "--diff-filter=D", "--name-only", previous, "HEAD"]).trim()) return false;
    const files = git(["diff", "--name-only", "-z", previous, "HEAD"]).split("\0").filter(Boolean);
    return onlyRuntimeData(files);
  } catch { return false; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const skip = shouldSkipDeployment();
  console.log(skip ? "Runtime data only: keep the deployed application; read new data from GitHub." : "Build required: code, compiled data, configuration or unavailable comparison base.");
  process.exitCode = skip ? 0 : 1;
}
