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
        <div class="repo-card" data-id="${repo.id}">
            <div class="repo-icon">
                <div class="icon-placeholder">📦</div>
            </div>
            <div class="repo-info">
                <h3><a href="${repo.html_url}" target="_blank">${repo.full_name}</a></h3>
                <span class="installed" data-name="${repo.full_name}"></span>
                <p>${repo.description || "No description available."}</p>
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
    document.querySelectorAll<HTMLDivElement>(".installed").forEach((card) => {
        const install = () => fetch("/api/install?auth=" + token + "&app=" + name);

        const name = card.getAttribute("data-name");
        const installed = zhivaInstalled.includes(name);
        card.innerHTML = installed ? "💜 Installed" : "❌ Not Installed";
        const btn = document.createElement("button");
        if (installed) {
            btn.innerHTML = "Update";
            btn.addEventListener("click", () => install());
        } else {
            btn.innerHTML = "Install";
            btn.addEventListener("click", async () => {
                const conf = confirm(`Are you sure you want to install ${name}?`);
                if (!conf) return;
                await install();
                zhivaInstalled.push(name);
                updateInstalled();
            });
        }
        card.parentElement.appendChild(btn);
    });
}