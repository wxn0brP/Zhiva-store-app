import { uiMsg } from "@wxn0brp/flanker-dialog/msg/index";
import { incrementCell, updateCell } from "@wxn0brp/flanker-ui/storeUtils";
import { showConfirmation, store } from "../confirm";
import { appsToUpdateCount, DISABLED_TITLE, zhivaInstalled } from "../vars";
import { fetchApi, IS_DESKTOP_APP } from "../../api";

export function updateInstalled() {
    document.querySelectorAll<HTMLDivElement>(".repo-card").forEach((card) => {
        const name = card.getAttribute("data-name");

        const installFn = () => {
            let pref = "";

            if (store.desktop.get()) pref += "d";
            if (store.menu.get()) pref += "m";
            if (store.not.get()) pref = "n";

            const query: Record<string, string> = {
                app: name
            };

            if (pref) query.shortcut = pref;

            console.log("Installing", name, query);

            return fetchApi("install", {}, query);
        }

        const installed = zhivaInstalled.get().includes(name);
        const installedEl = card.qs(".installed");
        if (installedEl)
            installedEl.innerHTML = installed ? "💜 Installed" : "❌ Not Installed";

        const installBtn = card.qs<HTMLButtonElement>(".install");
        const uninstallBtn = card.qs<HTMLButtonElement>(".uninstall");
        const openInFileExplorerBtn = card.qs<HTMLButtonElement>(".open-dir");

        if (installed && IS_DESKTOP_APP) {
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
                    async () => {
                        await fetchApi("uninstall", {}, { app: name });
                        updateCell(zhivaInstalled, (apps) => apps.filter((app) => app !== name));
                        updateInstalled();
                    }
                )
            }

            openInFileExplorerBtn.style.display = "";
            openInFileExplorerBtn.onclick = () => {
                openInFileExplorer(name);
            }
        } else {
            installBtn.innerHTML = "Install";
            installBtn.onclick = () => {
                const isVerified = card.getAttribute("data-verified") === "true";
                showConfirmation(
                    `Are you sure you want to install ${name}?`,
                    async () => {
                        installBtn.disabled = true;
                        installBtn.textContent = "Installing...";
                        await installFn();
                        zhivaInstalled.get().push(name);
                        installBtn.textContent = "Install";
                        installBtn.disabled = false;
                        updateInstalled();
                    },
                    {
                        showWarning: !isVerified,
                        shortcutOptions: true
                    }
                );
            }

            uninstallBtn.style.display = "none";
            openInFileExplorerBtn.style.display = "none";
        }

        const startBtn = card.qs<HTMLButtonElement>(".start");
        startBtn.style.display = installed || !IS_DESKTOP_APP ? "" : "none";

        startBtn.onclick = () => {
            fetchApi("start", {}, { app: name });
        }

        card.qs(".open-gh").onclick = () => {
            openGH(name);
        }
    });
}

function openGH(name: string) {
    const url = "https://github.com/" + name;
    if (IS_DESKTOP_APP) (window as any).zhiva_openExternal(url);
    else window.open(url, "_blank");
}

const updateAllBtn = qs<HTMLButtonElement>("#update-all-btn");

if (!IS_DESKTOP_APP) {
    updateAllBtn.disabled = true;
    updateAllBtn.title = DISABLED_TITLE;
}

updateAllBtn.onclick = async () => {
    updateAllBtn.disabled = true;
    updateAllBtn.textContent = "Updating...";

    const res = await fetchApi("update");
    const data = await res.json();

    updateAllBtn.disabled = false;
    updateAllBtn.textContent = "Update All";

    if (data.err) {
        uiMsg(`Error updating apps: ${data.msg}`);
        return;
    }

    uiMsg("💜 Apps updated successfully!");
    document.querySelectorAll(".repo-card").forEach(card => card.classList.remove("has-update"));

    const zhivaInstalledData = await fetchApi("installed").then(res => res.json());
    if (zhivaInstalledData.err) return;
    zhivaInstalled.set(zhivaInstalledData.apps);
    updateInstalled();
};

function openInFileExplorer(name: string) {
    fetchApi("open-dir", {}, { app: name });
}
