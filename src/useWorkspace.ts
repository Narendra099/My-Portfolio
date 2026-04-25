import { useCallback, useEffect, useState } from "react";

export type CommitInfo = {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

export type WorkspaceData = {
  repo: {
    name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    topics: string[];
    pushed_at: string;
    default_branch: string;
  };
  commits: CommitInfo[];
  lastRefreshed: string;
};

const POLL_INTERVAL = 60_000;

export function useWorkspace() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace");
      if (!response.ok) throw new Error("Unable to fetch workspace data");
      const payload = (await response.json()) as WorkspaceData;
      setData(payload);
      setRefreshedAt(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      void load();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  return { data, loading, error, refreshedAt, refresh: load };
}
