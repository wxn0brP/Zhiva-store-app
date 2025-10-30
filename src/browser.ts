import { mountView } from "@wxn0brp/flanker-ui";
import "@wxn0brp/flanker-ui/html";

const modal = qs("#confirmation-modal");
const modalMessage = qs<HTMLParagraphElement>("#modal-message");
const modalWarning = qs("#modal-warning");
const modalConfirm = qs<HTMLButtonElement>("#modal-confirm");
const modalCancel = qs<HTMLButtonElement>("#modal-cancel");

interface Repo {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    owner: { login: string };
    stargazers_count: number;
}

const ICON_PATHS = [
    "favicon.png",
    "favicon.svg",
    "public/favicon.png",
    "public/favicon.svg",
];

let zhivaInstalled: string[] = [];

function showConfirmation(message: string, showWarning: boolean, onConfirm: () => void) {
    if (!modal || !modalMessage || !modalWarning || !modalConfirm || !modalCancel) return;

    modalMessage.textContent = message;
    modalWarning.style.display = showWarning ? "block" : "none";
    modal.style.display = "flex";

    const confirmHandler = () => {
        onConfirm();
        hideModal();
    }

    const cancelHandler = () => {
        hideModal();
    }

    const hideModal = () => {
        modal.style.display = "none";
        modalConfirm.removeEventListener("click", confirmHandler);
        modalCancel.removeEventListener("click", cancelHandler);
    }

    modalConfirm.addEventListener("click", confirmHandler);
    modalCancel.addEventListener("click", cancelHandler);
}

async function findRepoIcon(repo: Repo): Promise<string | null> {
    const rawUrl = `https://raw.githubusercontent.com/${repo.full_name}/HEAD/`;
    const zhivaJsonUrl = rawUrl + `zhiva.json`;
    try {
        const res = await fetch(zhivaJsonUrl);
        if (res.ok) {
            const json = await res.json();
            if (json.icon) return rawUrl + json.icon;
        }
    } catch { }

    for (const path of ICON_PATHS) {
        const url = rawUrl + path;
        try {
            const res = await fetch(url, { method: "HEAD" });
            if (res.ok) return url;
        } catch { }
    }

    return null;
}

async function fetchZhivaRepos(): Promise<Repo[]> {
    const res = await fetch("https://api.github.com/search/repositories?q=topic:Zhiva-app");
    const data = await res.json();
    return data.items || [];
}

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

zhivaRepoListView.load();

const token = new URLSearchParams(window.location.search).get("auth");
fetch("/api/installed?auth=" + token).then(res => res.json()).then((data) => {
    if (data.err) return;
    zhivaInstalled = data.apps;
    updateInstalled();
});

function updateInstalled() {
    document.querySelectorAll<HTMLDivElement>(".repo-card").forEach((card) => {
        const name = card.getAttribute("data-name");
        const owner = card.getAttribute("data-owner");

        const installFn = () => fetch("/api/install?auth=" + token + "&app=" + name);

        const installed = zhivaInstalled.includes(name);
        const installedEl = card.qs(".installed");
        if (installedEl)
            installedEl.innerHTML = installed ? "💜 Installed" : "❌ Not Installed";

        const installBtn = card.qs<HTMLButtonElement>(".install");
        const uninstallBtn = card.qs<HTMLButtonElement>(".uninstall");

        if (installed) {
            installBtn.innerHTML = "Update";
            installBtn.onclick = async () => {
                await installFn();
                alert("💜 Updated");
            }

            uninstallBtn.style.display = "";
            uninstallBtn.onclick = () => {
                showConfirmation(
                    `Are you sure you want to uninstall ${name}?`,
                    false,
                    async () => {
                        await fetch("/api/uninstall?auth=" + token + "&app=" + name);
                        zhivaInstalled = zhivaInstalled.filter((app) => app !== name);
                        updateInstalled();
                    }
                )
            }
        } else {
            installBtn.innerHTML = "Install";
            installBtn.onclick = () => {
                const isVerified = owner === "wxn0brP";
                showConfirmation(
                    `Are you sure you want to install ${name}?`,
                    !isVerified,
                    async () => {
                        await installFn();
                        zhivaInstalled.push(name);
                        updateInstalled();
                    }
                );
            }

            uninstallBtn.style.display = "none";
        }

        const startBtn = card.qs<HTMLButtonElement>(".start");
        startBtn.style.display = installed ? "" : "none";

        startBtn.onclick = () => {
            fetch("/api/start?auth=" + token + "&app=" + name);
        }

        card.qs(".open-gh").onclick = () => {
            fetch("/api/open-gh?auth=" + token + "&app=" + name);
        }

        card.qs("a").onclick = (e) => {
            e.preventDefault();
            fetch("/api/open-gh?auth=" + token + "&app=" + name);
        }
    });
}