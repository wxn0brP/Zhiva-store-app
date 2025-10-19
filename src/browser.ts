import { mountView } from "@wxn0brp/flanker-ui";
import "@wxn0brp/flanker-ui/html";

interface Repo {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    owner: { login: string };
}

const ICON_PATHS = [
    "favicon.png",
    "favicon.svg",
    "public/favicon.png",
    "public/favicon.svg",
];

let zhivaInstalled: string[] = [];

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
    template: (repo) => `
        <div class="repo-card" data-id="${repo.id}" data-name="${repo.full_name}">
            <div class="repo-icon">
                <div class="icon-placeholder">📦</div>
            </div>
            <div class="repo-info">
                <h3><a href="${repo.html_url}" target="_blank">${repo.full_name}</a></h3>
                <span class="installed"></span>
                <p>${repo.description || "No description available."}</p>
            </div>
            <div class="repo-actions">
                <button class="install">Install</button>
                <button class="start">Start</button>
                <button class="open-gh">Open on GitHub</button>
            </div>
        </div>
    `,
    onData: (repos) => {
        repos.forEach(async (repo: Repo) => {
            const iconUrl = await findRepoIcon(repo);
            const card = document.querySelector(`.repo-card[data-id="${repo.id}"] .repo-icon`);
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
        const installFn = () => fetch("/api/install?auth=" + token + "&app=" + name);

        const name = card.getAttribute("data-name");

        const installed = zhivaInstalled.includes(name);
        card.qs(".installed").innerHTML = installed ? "💜 Installed" : "❌ Not Installed";

        const installBtn = card.qs<HTMLButtonElement>(".install");
        if (installed) {
            installBtn.innerHTML = "Update";
            installBtn.addEventListener("click", async () => {
                await installFn();
                alert("💜 Updated");
            });
        } else {
            installBtn.innerHTML = "Install";
            installBtn.addEventListener("click", async () => {
                const conf = confirm(`Are you sure you want to install ${name}?`);
                if (!conf) return;
                await installFn();
                zhivaInstalled.push(name);
                updateInstalled();
            });
        }

        const startBtn = card.qs<HTMLButtonElement>(".start");
        startBtn.style.display = installed ? "" : "none";
        startBtn.addEventListener("click", () => {
            fetch("/api/start?auth=" + token + "&app=" + name);
        });

        const ghBtn = card.qs<HTMLButtonElement>(".open-gh");
        ghBtn.addEventListener("click", () => {
            fetch("/api/open-gh?auth=" + token + "&app=" + name);
        });
    });
}