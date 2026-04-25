import cors from "cors";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { google } from "googleapis";
import { config } from "./config.js";
import { getAvailability, syncAvailability } from "./calendarSync.js";
import { createOAuthClient, loadOAuthClient, readStoredTokens, saveTokens } from "./googleAuth.js";

const githubUsername = "Narendra099";
const accentCycle = ["Mono", "Graph", "Build", "Ship", "Code", "Stack"];

function buildGithubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "narendra-portfolio",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

type WorkspaceCommit = {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

type WorkspacePayload = {
  repo: {
    name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    topics: string[];
    pushed_at: string;
    default_branch: string;
  };
  commits: WorkspaceCommit[];
  lastRefreshed: string;
};

let workspaceCache: { data: WorkspacePayload; expiresAt: number } | null = null;
const WORKSPACE_CACHE_TTL = 30_000;
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(serverDir, "../dist");
const distIndex = path.join(distDir, "index.html");

function repoStatus(pushedAt: string) {
  const diffDays = Math.floor((Date.now() - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 2) {
    return "Updated recently";
  }
  if (diffDays <= 14) {
    return "Active this month";
  }
  if (diffDays <= 60) {
    return "Recently maintained";
  }
  return "Public archive";
}

function normalizeStack(repo: {
  language: string | null;
  topics?: string[];
  name: string;
}) {
  const stack = new Set<string>();
  if (repo.language) {
    stack.add(repo.language);
  }
  for (const topic of repo.topics ?? []) {
    if (topic && stack.size < 4) {
      stack.add(topic.replace(/-/g, " "));
    }
  }
  if (stack.size === 0) {
    stack.add("Source code");
  }
  return Array.from(stack).slice(0, 4);
}

async function fetchLatestCommitDate(repoName: string, defaultBranch: string) {
  const response = await fetch(
    `https://api.github.com/repos/${githubUsername}/${repoName}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=1`,
    { headers: buildGithubHeaders() },
  );

  if (!response.ok) {
    throw new Error(`GitHub commits API request failed with ${response.status}`);
  }

  const commits = (await response.json()) as Array<{
    commit?: {
      committer?: {
        date?: string;
      };
      author?: {
        date?: string;
      };
    };
  }>;

  const latest = commits[0]?.commit?.committer?.date ?? commits[0]?.commit?.author?.date ?? null;
  return latest;
}

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/auth/status", async (_req, res) => {
  const tokens = await readStoredTokens();
  res.json({ connected: Boolean(tokens?.refresh_token) });
});

app.get("/auth/google", (_req, res) => {
  const state = crypto
    .createHmac("sha256", config.sessionSecret)
    .update(String(Date.now()))
    .digest("hex");

  const oauthClient = createOAuthClient();
  const url = oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.freebusy"],
    state,
  });

  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  if (typeof code !== "string") {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  try {
    const oauthClient = createOAuthClient();
    const { tokens } = await oauthClient.getToken(code);
    await saveTokens(tokens);
  } catch (err) {
    console.error("[oauth] Token exchange failed:", err);
    res.redirect(`${config.frontendUrl}#schedule?auth_error=1`);
    return;
  }

  // Sync is best-effort — tokens are already saved, user can refresh manually
  try {
    await syncAvailability();
  } catch (err) {
    console.error("[oauth] Initial calendar sync failed:", err);
  }

  res.redirect(`${config.frontendUrl}#schedule?connected=1`);
});

app.post("/api/sync", async (_req, res) => {
  try {
    const availability = await syncAvailability();
    res.json(availability);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to sync calendar",
    });
  }
});

app.get("/api/calendars", async (_req, res) => {
  try {
    const auth = await loadOAuthClient();
    const calendar = google.calendar({ version: "v3", auth });
    const response = await calendar.calendarList.list();

    const calendars =
      response.data.items?.map((item) => ({
        id: item.id,
        summary: item.summary,
        primary: Boolean(item.primary),
        accessRole: item.accessRole,
      })) ?? [];

    res.json({ calendars });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to list calendars",
    });
  }
});

app.get("/api/availability", async (_req, res) => {
  try {
    const availability = await getAvailability();
    res.json(availability);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to load availability",
    });
  }
});

let projectsCache: { data: { projects: unknown[] }; expiresAt: number } | null = null;
const PROJECTS_CACHE_TTL = 5 * 60_000;

app.get("/api/projects", async (_req, res) => {
  const cached = projectsCache;
  if (cached && Date.now() < cached.expiresAt) {
    res.json(cached.data);
    return;
  }

  try {
    const response = await fetch(
      `https://api.github.com/users/${githubUsername}/repos?sort=pushed&direction=desc&per_page=100`,
      { headers: buildGithubHeaders() },
    );

    if (!response.ok) {
      throw new Error(`GitHub API request failed with ${response.status}`);
    }

    const repos = (await response.json()) as Array<{
      name: string;
      description: string | null;
      html_url: string;
      language: string | null;
      topics?: string[];
      pushed_at: string;
      updated_at: string;
      default_branch: string;
      fork: boolean;
      archived: boolean;
    }>;

    const enrichedRepos = await Promise.all(
      repos
        .filter((repo) => !repo.fork)
        .map(async (repo) => {
          try {
            const latestCommitAt = await fetchLatestCommitDate(repo.name, repo.default_branch);
            return {
              ...repo,
              latestCommitAt: latestCommitAt ?? repo.pushed_at ?? repo.updated_at,
            };
          } catch {
            return {
              ...repo,
              latestCommitAt: repo.pushed_at ?? repo.updated_at,
            };
          }
        }),
    );

    const projects = enrichedRepos
      .sort(
        (a, b) => new Date(b.latestCommitAt).getTime() - new Date(a.latestCommitAt).getTime(),
      )
      .map((repo, index) => ({
        name: repo.name.replace(/-/g, " "),
        summary:
          repo.description ??
          "Public repository from my GitHub profile, surfaced here based on recent commit activity.",
        stack: normalizeStack(repo),
        status: repo.archived ? "Archived project" : repoStatus(repo.latestCommitAt),
        link: repo.html_url,
        accent: accentCycle[index % accentCycle.length],
        pushedAt: repo.latestCommitAt,
      }));

    const data = { projects };
    projectsCache = { data, expiresAt: Date.now() + PROJECTS_CACHE_TTL };
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to load GitHub projects",
    });
  }
});

app.get("/api/workspace", async (_req: express.Request, res: express.Response) => {
  const cachedWs = workspaceCache;
  if (cachedWs && Date.now() < cachedWs.expiresAt) {
    res.json(cachedWs.data);
    return;
  }

  try {
    const reposResponse = await fetch(
      `https://api.github.com/users/${githubUsername}/repos?sort=pushed&direction=desc&per_page=20`,
      { headers: buildGithubHeaders() },
    );

    if (!reposResponse.ok) {
      throw new Error(`GitHub API request failed with ${reposResponse.status}`);
    }

    const repos = (await reposResponse.json()) as Array<{
      name: string;
      description: string | null;
      html_url: string;
      language: string | null;
      topics?: string[];
      pushed_at: string;
      default_branch: string;
      fork: boolean;
      archived: boolean;
    }>;

    const activeRepo = repos.find((r) => !r.fork && !r.archived);
    if (!activeRepo) {
      throw new Error("No active repositories found");
    }

    const commitsResponse = await fetch(
      `https://api.github.com/repos/${githubUsername}/${activeRepo.name}/commits?per_page=8`,
      { headers: buildGithubHeaders() },
    );

    if (!commitsResponse.ok) {
      throw new Error(`GitHub commits API request failed with ${commitsResponse.status}`);
    }

    const rawCommits = (await commitsResponse.json()) as Array<{
      sha: string;
      html_url: string;
      commit: {
        message: string;
        author?: { name?: string; date?: string };
        committer?: { name?: string; date?: string };
      };
    }>;

    const commits: WorkspaceCommit[] = rawCommits.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message,
      author:
        c.commit.author?.name ??
        c.commit.committer?.name ??
        "Unknown",
      date:
        c.commit.author?.date ??
        c.commit.committer?.date ??
        activeRepo.pushed_at,
      url: c.html_url,
    }));

    const data: WorkspacePayload = {
      repo: {
        name: activeRepo.name,
        description: activeRepo.description,
        html_url: activeRepo.html_url,
        language: activeRepo.language,
        topics: activeRepo.topics ?? [],
        pushed_at: activeRepo.pushed_at,
        default_branch: activeRepo.default_branch,
      },
      commits,
      lastRefreshed: new Date().toISOString(),
    };

    workspaceCache = { data, expiresAt: Date.now() + WORKSPACE_CACHE_TTL };
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to load workspace data",
    });
  }
});

if (existsSync(distIndex)) {
  app.use(express.static(distDir));

  app.get(/^(?!\/(?:api|auth)(?:\/|$)).*/, (_req, res) => {
    res.sendFile(distIndex);
  });
}

app.listen(config.port, () => {
  console.log(`Calendar sync server listening on http://localhost:${config.port}`);
});
