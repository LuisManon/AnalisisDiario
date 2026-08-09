const githubApiBase = "https://api.github.com";

type GitHubContentResponse = {
  content?: string;
  encoding?: string;
  sha?: string;
};

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token || !repository) return null;

  return {
    branch,
    committerEmail: process.env.GITHUB_COMMITTER_EMAIL ?? "actions@github.com",
    committerName: process.env.GITHUB_COMMITTER_NAME ?? "Analisis Diario",
    repository,
    token
  };
}

export function isGitHubDataStoreEnabled() {
  return Boolean(getConfig());
}

function getHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "AnalisisDiario/1.0",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function toBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function fromBase64(value: string) {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}

export async function readGitHubJsonFile(filePath: string) {
  const config = getConfig();
  if (!config) return null;

  const url = `${githubApiBase}/repos/${config.repository}/contents/${filePath}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: getHeaders(config.token),
    signal: AbortSignal.timeout(20_000)
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub no pudo leer ${filePath}: HTTP ${response.status}.`);

  const payload = (await response.json()) as GitHubContentResponse;
  if (payload.encoding !== "base64" || !payload.content) {
    throw new Error(`GitHub devolvio un formato inesperado para ${filePath}.`);
  }

  return fromBase64(payload.content);
}

async function getCurrentFileSha(filePath: string, token: string, repository: string, branch: string) {
  const url = `${githubApiBase}/repos/${repository}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: getHeaders(token),
    signal: AbortSignal.timeout(20_000)
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub no pudo revisar ${filePath}: HTTP ${response.status}.`);

  const payload = (await response.json()) as GitHubContentResponse;
  return payload.sha ?? null;
}

export async function writeGitHubJsonFile(filePath: string, content: string, commitMessage: string) {
  const config = getConfig();
  if (!config) return false;

  const current = await readGitHubJsonFile(filePath);
  if (current?.trim() === content.trim()) return true;

  const sha = await getCurrentFileSha(filePath, config.token, config.repository, config.branch);
  const url = `${githubApiBase}/repos/${config.repository}/contents/${filePath}`;
  const response = await fetch(url, {
    method: "PUT",
    cache: "no-store",
    headers: getHeaders(config.token),
    body: JSON.stringify({
      branch: config.branch,
      committer: {
        email: config.committerEmail,
        name: config.committerName
      },
      content: toBase64(content),
      message: commitMessage,
      ...(sha ? { sha } : {})
    }),
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) throw new Error(`GitHub no pudo guardar ${filePath}: HTTP ${response.status}.`);
  return true;
}
