import { ZhivaApiOptions, ZhivaApiQuery } from "@wxn0brp/zhiva-base-lib/types/api";

export async function mockFetchApi(endpoint: string, options: ZhivaApiOptions = {}, query: ZhivaApiQuery = {}): Promise<Response> {
    console.log(`[BROWSER MODE] Mocked API call for: ${endpoint}`, { options, query });
    const appName = query?.app;

    switch (endpoint) {
        case "installed":
            return new Response(JSON.stringify({ apps: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        case "get-updates":
            return new Response(JSON.stringify({ err: false, updates: {} }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        case "install":
            window.location.href = `zhiva://install/${appName}`;
            return new Response(JSON.stringify({ err: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        case "start":
            window.location.href = `zhiva://start/${appName}`;
            return new Response(JSON.stringify({ err: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        case "uninstall":
        case "update":
            console.warn(`Action "${endpoint}" is not available in browser-only mode. Doing nothing.`);
            return new Response(JSON.stringify({ err: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        case "apps":
            return new Response(JSON.stringify({ err: false, apps: await fetchApps() }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        default:
            console.error(`Endpoint not mocked for browser mode: ${endpoint}`);
            return new Response(JSON.stringify({ err: true, msg: "Endpoint not mocked for browser mode" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
    }
}

interface Repo {
    name: string;
    desc: string;
    stars: number;
    verified?: boolean;
}

async function getFromCache(key: string, ttl: number, fetcher: (...args: any[]) => Promise<any>, args: any[] = []) {
    const cache = localStorage.getItem(key);
    if (cache) return JSON.parse(cache);
    const data = await fetcher(...args);
    localStorage.setItem(key, JSON.stringify(data));
    setTimeout(() => localStorage.removeItem(key), ttl);
    return data;
}

async function fetchApps() {
    let apps: Repo[] = await getFromCache("search", 5 * 60 * 1000, fetchAllRepos);
    const banned: string[] = await getFromCache("banned", 5 * 60 * 1000, fetchBanned);

    apps = apps.filter(item => !banned.includes(item.name));

    const verified = await getFromCache(
        "verified",
        5 * 60 * 1000,
        fetchVerified,
        [
            apps.map(item => item.name)
        ]
    );

    apps.forEach(item => item.verified = verified.includes(item.name));
    console.log("Fetched apps:", apps);
    return apps;
}

async function fetchAllRepos(): Promise<Repo[]> {
    const data = await fetch("https://api.github.com/search/repositories?q=topic:Zhiva-app").then((res) => res.json());
    return data.items.map((item: any) => ({
        name: item.full_name,
        desc: item.description,
        stars: item.stargazers_count
    }));
}

async function fetchData(file: string) {
    const data = await fetch(`https://raw.githubusercontent.com/wxn0brP/Zhiva-registry/HEAD/${file}.txt`).then((res) => res.text());
    return data.split("\n").map(line => line.split("#")[0].trim()).filter(Boolean);
}

async function fetchBanned() {
    return await fetchData("banned");
}

async function fetchVerified(installedApps: string[]) {
    const apps = await fetchData("verified");
    apps.push(...installedApps.filter(app => app.startsWith("wxn0brP/")));
    return apps;
}
