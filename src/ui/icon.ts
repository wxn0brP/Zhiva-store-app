import { log } from "../log";
import { getManifest } from "./manifest";
import { Repo } from "./types";
import { gitRaw } from "./vars";

const ICON_PATHS = [
	"favicon.png",
	"favicon.svg",
	"public/favicon.png",
	"public/favicon.svg",
];

const DEFAULT_ICON = "/zhiva-assets/zhiva.ico";

export async function findRepoIcon(repo: Repo): Promise<string | null> {
	const manifest = await getManifest(repo);
	const manifestIcon = manifest.icon || manifest.win_icon;

	if (manifestIcon === "default") {
		log.debug("Z-STORE-4-04", `icon default ${repo.name}`, {
			icon: DEFAULT_ICON,
		});
		return DEFAULT_ICON;
	}

	if (manifestIcon) {
		const url = `${gitRaw}${repo.name}/HEAD/${manifestIcon}`;
		log.debug("Z-STORE-4-04", `icon manifest ${repo.name}`, {
			url,
		});
		return url;
	}

	for (const path of ICON_PATHS) {
		const url = `${gitRaw}${repo.name}/HEAD/${path}`;
		try {
			const res = await fetch(url, {
				method: "HEAD",
			});
			if (res.ok) {
				log.debug("Z-STORE-4-04", `icon fallback ${repo.name}`, {
					path,
				});
				return url;
			}
		} catch (error: any) {
			log.debug("Z-STORE-4-04", `icon probe failed ${repo.name}`, {
				path,
				msg: error?.message,
			});
		}
	}

	log.debug("Z-STORE-4-04", `icon none ${repo.name}`);
	return null;
}
