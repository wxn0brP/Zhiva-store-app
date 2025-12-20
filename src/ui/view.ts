import { mountView } from "@wxn0brp/flanker-ui";
import { findRepoIcon } from "./icon";
import { fetchZhivaRepos } from "./repo";
import { Repo } from "./types";
import { updateInstalled } from "./update/update";

export const zhivaRepoListView = mountView({
    selector: "#zhiva-repo-list",
    queryFunction: () => fetchZhivaRepos(),
    template: (repo: Repo) => `
        <div class="repo-card" data-id="${repo.id}" data-name="${repo.full_name}" data-owner="${repo.owner.login}">
            <div class="repo-header">
                <div class="repo-icon">
                    <div class="icon-placeholder">📦</div>
                </div>
                <div class="repo-info">
                    <h3><a href="${repo.html_url}">${repo.full_name}</a></h3>
                    <span class="installed"></span>
                </div>
            </div>
            <p class="repo-description">${repo.description || "No description available."}</p>
            <div class="repo-actions">
                <button class="install">Install</button>
                <button class="uninstall" style="color: red">UnInstall</button>
                <button class="start">Start</button>
                <button class="open-gh">Open on GitHub</button>
            </div>
        </div>
    `,
    onData: (repos) => {
        repos.forEach(async (repo: Repo) => {
            const iconUrl = await findRepoIcon(repo);
            const card = qs(`.repo-card[data-id="${repo.id}"] .repo-icon`);
            if (!card) return;
            if (!iconUrl) return;

            const img = document.createElement("img");
            img.src = iconUrl;
            img.alt = `icon for ${repo.name}`;
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