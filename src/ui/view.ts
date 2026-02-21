import { mountView } from "@wxn0brp/flanker-ui";
import { findRepoIcon } from "./icon";
import { Repo } from "./types";
import { updateInstalled } from "./update/update";
import { fetchApi } from "../api";

export const zhivaRepoListView = mountView({
    selector: "#zhiva-repo-list",
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
                ${repo.verified ? `<span class="badge verified" title="Verified by Zhiva Team">
                    <img src="icons/verified.svg" width="12" height="12" alt="Verified">
                    <span>Verified</span>
                </span>` : ''}
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
    onData: (repos) => {
        repos.forEach(async (repo: Repo) => {
            const iconUrl = await findRepoIcon(repo);
            const card = qs(`.repo-card[data-name="${repo.name}"] .repo-icon`);
            if (!card) return;
            if (!iconUrl) return;

            const img = document.createElement("img");
            img.src = iconUrl;
            img.alt = `📦`;
            img.width = 32;
            img.height = 32;
            card.innerHTML = "";
            card.appendChild(img);
        });
        setTimeout(() => {
            updateInstalled();
        }, 100);
    },
    sort: (a, b) => b.stargazers_count - a.stargazers_count,
});

async function fetchZhivaRepos() {
    const res = await fetchApi("apps");
    const data = await res.json();
    if (data.err) return [];
    return data.apps;
}
