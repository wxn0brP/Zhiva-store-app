import { mountView } from "@wxn0brp/flanker-ui";
import { fetchApi } from "../api";
import { log, timer } from "../log";
import { findRepoIcon } from "./icon";
import { Repo } from "./types";
import { updateInstalled } from "./update/update";

const listSelector = "#zhiva-repo-list";

export const zhivaRepoListView = mountView({
	selector: listSelector,
	queryFunction: () => fetchZhivaRepos(),
	template: (repo: Repo) => `
<div
    class="repo-card"
    data-name="${repo.name}"
    data-verified="${repo.verified}"
>
    <div class="repo-header">
        <div class="repo-icon">
            <div class="icon-placeholder">📦</div>
        </div>
        <div class="repo-info">
            <div class="repo-title-row">
                <h3>
                    <a href="https://github.com/${repo.name}" target="_blank">${repo.name}</a>
                </h3>
                ${
									repo.verified
										? `<span class="badge verified" title="Verified by Zhiva Team">
                    <img src="icons/verified.svg" width="12" height="12" alt="Verified">
                    <span>Verified</span>
                </span>`
										: ""
								}
            </div>
            <span class="installed"></span>
        </div>
    </div>
    <div class="repo-body">
        <p class="repo-description">${repo.desc || "No description provided."}</p>
    </div>
    <div class="repo-footer">
        <div class="repo-actions">
            <button class="btn-primary install">Install</button>
            <button class="btn-success start" style="display: none;">Launch</button>
            
            <div class="icon-actions">
                <button class="btn-icon uninstall" style="display: none; color: #ef4444;" title="Uninstall">
                    <img src="icons/uninstall.svg" width="18" height="18" alt="Uninstall">
                </button>
                <button class="btn-icon open-dir" title="Open Local Files">
                    <img src="icons/folder.svg" width="18" height="18" alt="Local">
                </button>
                <button class="btn-icon open-gh" title="Open on GitHub">
                    <img src="icons/github.svg" width="18" height="18" alt="GitHub">
                </button>
            </div>
        </div>
    </div>
</div>
    `,
	onData: repos => {
		Promise.allSettled(
			repos.map(async (repo: Repo) => {
				const iconUrl = await findRepoIcon(repo);
				const card = qs(`.repo-card[data-name="${repo.name}"] .repo-icon`);
				if (!card || !iconUrl) return false;

				const img = document.createElement("img");
				img.src = iconUrl;
				img.alt = `📦`;
				img.width = 32;
				img.height = 32;
				card.innerHTML = "";
				card.appendChild(img);
				return true;
			}),
		).then(results => {
			const rejected = results.filter(result => result.status === "rejected");
			const failed = results.filter(
				result => result.status === "fulfilled" && !result.value,
			).length;

			for (const result of rejected)
				log.warn("Z-STORE-4-05", "icon failed", result.reason);

			log.debug("Z-STORE-4-04", "icons resolved", {
				total: repos.length,
				applied: repos.length - failed - rejected.length,
				failed,
				rejected: rejected.length,
			});
		});

		updateInstalled();
	},
	sort: (a, b) => b.stargazers_count - a.stargazers_count,
	emptyData: `
<div class="repo-state">
    <h3>No applications found</h3>
    <p>The registry returned an empty list.</p>
</div>`,
	onError: renderRepoListError,
});

export function renderRepoListError(error: any) {
	log.error("Z-STORE-4-02", "fetchZhivaRepos failed", {
		msg: error?.message ?? String(error),
	});
	const el = document.querySelector<HTMLElement>(listSelector);
	if (!el) return;

	el.innerHTML = `
<div class="repo-state">
    <h3>Could not load applications</h3>
    <p>${escapeHtml(error?.message ?? "Unknown error")}</p>
    <p class="repo-state-hint">Check your connection and reload the store.</p>
</div>`;
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

async function fetchZhivaRepos() {
	const elapsed = timer();
	if (!navigator.onLine) throw new Error("You are offline.");

	const res = await fetchApi("apps");
	if (!res.ok)
		throw new Error(`The store backend returned HTTP ${res.status}.`);

	const data = await res.json();
	if (data.err)
		throw new Error(data.msg || "The store backend reported an error.");

	const apps = data.apps ?? [];
	log.info("Z-STORE-4-01", "repo list loaded", {
		count: apps.length,
		ms: elapsed(),
	});
	return apps;
}
