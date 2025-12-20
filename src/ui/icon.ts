import { gitRaw } from "./vars";
import { getManifest } from "./manifest";
import { Repo } from "./types";

const ICON_PATHS = [
    "favicon.png",
    "favicon.svg",
    "public/favicon.png",
    "public/favicon.svg",
];

export async function findRepoIcon(repo: Repo): Promise<string | null> {
    const manifest = await getManifest(repo);
    if (manifest.icon === "default" || (!manifest.icon && manifest.win_icon === "default"))
        return `/zhiva-assets/zhiva.ico`;
    if (manifest.icon || manifest.win_icon)
        return `${gitRaw}${repo.full_name}/HEAD/${manifest.icon || manifest.win_icon}`;

    for (const path of ICON_PATHS) {
        const url = gitRaw + repo.full_name + "/HEAD/" + path;
        try {
            const res = await fetch(url, { method: "HEAD" });
            if (res.ok) return url;
        } catch { }
    }

    return null;
}