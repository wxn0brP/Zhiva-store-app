import { gitRaw } from "./vars";
import { Manifest, Repo } from "./types";

const appsManifest: Record<string, Manifest> = {};

export async function loadManifest(name: string) {
    const url = `${gitRaw}${name}/HEAD/zhiva.json`;
    try {
        const res = await fetch(url);
        if (res.ok) {
            const json = await res.json();
            appsManifest[name] = json;
        }
    } catch {
        appsManifest[name] = null;
    }
}

export async function getManifest(repo: Repo | string) {
    const name = typeof repo === "string" ? repo : repo.full_name;
    const cache = appsManifest[name];
    if (cache) return cache;
    if (cache === null) return {};
    await loadManifest(name);
    return appsManifest[name];
}