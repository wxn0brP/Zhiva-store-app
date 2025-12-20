import { Repo } from "./types";

export async function fetchZhivaRepos(): Promise<Repo[]> {
    const cachedData = localStorage.getItem("reposCache");
    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            if (data.time > Date.now()) return data.data;
            localStorage.removeItem("reposCache");
        } catch (e) {
            console.warn("Cache parsing failed", e);
        }
    }

    const res = await fetch("https://api.github.com/search/repositories?q=topic:Zhiva-app");
    const data = await res.json();
    const repos = data.items || [];

    localStorage.setItem("reposCache", JSON.stringify({
        time: Date.now() + 1000 * 60 * 10, // 10 minutes
        data: repos,
    }));

    return repos;
}