import { useEffect, useState } from "react";
import { featuredProjects, type Project } from "./data";

type GithubProject = Project & {
  pushedAt: string;
};

type ProjectsResponse = {
  projects: GithubProject[];
};

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(featuredProjects);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/projects");
        if (!response.ok) {
          throw new Error("Unable to fetch GitHub projects");
        }

        const payload = (await response.json()) as ProjectsResponse;
        if (payload.projects?.length) {
          setProjects(payload.projects);
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to load GitHub projects");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return { projects, loading, error };
}
