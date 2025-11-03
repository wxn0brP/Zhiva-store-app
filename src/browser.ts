import { uiMsg } from "@wxn0brp/flanker-dialog";
import "@wxn0brp/flanker-dialog/style.css";
import { mountView, ReactiveCell } from "@wxn0brp/flanker-ui";
import "@wxn0brp/flanker-ui/html";
import { incrementCell } from "@wxn0brp/flanker-ui/storeUtils";

const modal = qs("#confirmation-modal");
const modalMessage = qs<HTMLParagraphElement>("#modal-message");
const modalWarning = qs("#modal-warning");
const modalConfirm = qs<HTMLButtonElement>("#modal-confirm");
const modalCancel = qs<HTMLButtonElement>("#modal-cancel");
const checkUpdatesBtn = qs<HTMLButtonElement>("#check-updates-btn");
const updateAllBtn = qs<HTMLButtonElement>("#update-all-btn");
const updateStatus = qs("#update-status");

interface Repo {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    owner: { login: string };
    stargazers_count: number;
}

interface Manifest {
    name?: string;
    icon?: string;
    win_icon?: string;
    description?: string;
    version?: string;
    author?: string;
}

const ICON_PATHS = [
    "favicon.png",
    "favicon.svg",
    "public/favicon.png",
    "public/favicon.svg",
];

let zhivaInstalled: string[] = [];
const appsManifest: Record<string, Manifest> = {};
const appsToUpdateCount = new ReactiveCell(0);

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

async function loadManifest(name: string) {
    const url = `https://raw.githubusercontent.com/${name}/HEAD/zhiva.json`;
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

async function getManifest(repo: Repo | string) {
    const name = typeof repo === "string" ? repo : repo.full_name;
    const cache = appsManifest[name];
    if (cache) return cache;
    if (cache === null) return {};
    await loadManifest(name);
    return appsManifest[name];
}

async function findRepoIcon(repo: Repo): Promise<string | null> {
    const manifest = await getManifest(repo);
    if (manifest.icon) return `https://raw.githubusercontent.com/${repo.full_name}/HEAD/${manifest.icon}`;

    for (const path of ICON_PATHS) {
        const url = "https://raw.githubusercontent.com/" + repo.full_name + "/HEAD/" + path;
        try {
            const res = await fetch(url, { method: "HEAD" });
            if (res.ok) return url;
        } catch { }
    }

    return null;
}

async function fetchZhivaRepos(): Promise<Repo[]> {
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
                installBtn.disabled = true;
                installBtn.textContent = "Updating...";
                await installFn();
                installBtn.textContent = "Update";
                installBtn.disabled = false;
                uiMsg("💜 Updated");
                card.clR("has-update");
                incrementCell(appsToUpdateCount, -1);
            }

            uninstallBtn.style.display = "";
            uninstallBtn.onclick = () => {
                if (installBtn.disabled) return;
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
                        installBtn.disabled = true;
                        installBtn.textContent = "Installing...";
                        await installFn();
                        zhivaInstalled.push(name);
                        installBtn.textContent = "Install";
                        installBtn.disabled = false;
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

checkUpdatesBtn.onclick = () => {
    checkForUpdates();
    localStorage.removeItem("reposCache");
}
checkForUpdates();

appsToUpdateCount.subscribe(count => {
    if (count < 0) return appsToUpdateCount.set(0);
    if (!count) return updateStatus.innerHTML = "No updates available";
    updateStatus.innerHTML = `Updates available for: ${count} app${count === 1 ? "" : "s"}.`;
})

async function checkForUpdates() {
    checkUpdatesBtn.disabled = true;
    updateStatus.innerHTML = "Checking...";

    document.querySelectorAll(".repo-card").forEach(card => card.classList.remove("has-update"));

    const res = await fetch("/api/get-updates?auth=" + token);
    const data = await res.json();
    const updates = data.updates;

    checkUpdatesBtn.disabled = false;

    if (data.err) {
        console.error(`Error checking for updates: ${data.msg}`);
        updateStatus.innerHTML = `<span style="color: red;">Error checking for updates</span>`;
        return;
    }

    const appsToUpdate = Object.keys(updates).filter(app => updates[app]);
    appsToUpdateCount.set(appsToUpdate.length);
    appsToUpdate.forEach(appName => {
        const card = qs(`.repo-card[data-name="${appName}"]`);
        if (card) {
            card.classList.add("has-update");
            const updateBtn = card.qs<HTMLButtonElement>(".install");
            if (updateBtn) updateBtn.textContent = "Update available";
        }
    });
}

updateAllBtn.onclick = async () => {
    updateAllBtn.disabled = true;
    updateAllBtn.textContent = "Updating...";

    const res = await fetch("/api/update?auth=" + token);
    const data = await res.json();

    updateAllBtn.disabled = false;
    updateAllBtn.textContent = "Update All";

    if (data.err) {
        uiMsg(`Error updating apps: ${data.msg}`);
        return;
    }

    uiMsg("💜 Apps updated successfully!");
    document.querySelectorAll(".repo-card").forEach(card => card.classList.remove("has-update"));
    fetch("/api/installed?auth=" + token).then(res => res.json()).then((data) => {
        if (data.err) return;
        zhivaInstalled = data.apps;
        updateInstalled();
    });
};