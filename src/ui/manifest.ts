import { log } from "../log";
import { gitRaw } from "./vars";
import { Manifest, Repo } from "./types";

const appsManifest: Record<string, Manifest | null> = {};

export async function loadManifest(name: string) {
	const url = `${gitRaw}${name}/HEAD/zhiva.json`;
	try {
		const res = await fetch(url);
		if (!res.ok) {
			log.debug("Z-STORE-4-03", `manifest miss ${name}`, {
				status: res.status,
			});
			appsManifest[name] = null;
			return;
		}

		const json = await res.json();
		if (!json || typeof json !== "object" || Array.isArray(json)) {
			log.warn("Z-STORE-4-03", `manifest invalid ${name}`, {
				type: typeof json,
			});
			appsManifest[name] = null;
			return;
		}

		appsManifest[name] = json as Manifest;
		log.debug("Z-STORE-4-03", `manifest hit ${name}`, {
			icon: json.icon ?? null,
			win_icon: json.win_icon ?? null,
		});
	} catch (error: any) {
		log.debug("Z-STORE-4-03", `manifest error ${name}`, {
			msg: error?.message,
		});
		appsManifest[name] = null;
	}
}

export async function getManifest(repo: Repo | string): Promise<Manifest> {
	const name = typeof repo === "string" ? repo : repo.name;
	const cached = appsManifest[name];
	if (cached) return cached;
	if (cached === null) return {};
	await loadManifest(name);
	return appsManifest[name] ?? {};
}
