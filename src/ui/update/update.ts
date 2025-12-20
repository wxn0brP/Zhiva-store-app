import { uiMsg } from "@wxn0brp/flanker-dialog";
import { incrementCell, updateCell } from "@wxn0brp/flanker-ui/storeUtils";
import { showConfirmation } from "../confirm";
import { appsToUpdateCount, zhivaInstalled } from "../vars";
import { fetchApi } from "@wxn0brp/zhiva-base-lib/front/api";

export function updateInstalled() {
    document.querySelectorAll<HTMLDivElement>(".repo-card").forEach((card) => {
        const name = card.getAttribute("data-name");
        const owner = card.getAttribute("data-owner");

        const installFn = () => fetchApi("install", {}, { app: name });

        const installed = zhivaInstalled.get().includes(name);
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
                        await fetchApi("uninstall", {}, { app: name });
                        updateCell(zhivaInstalled, (apps) => apps.filter((app) => app !== name));
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
                        zhivaInstalled.get().push(name);
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
            fetchApi("start", {}, { app: name });
        }

        card.qs(".open-gh").onclick = () => {
            fetchApi("open-gh", {}, { app: name });
        }

        card.qs("a").onclick = (e) => {
            e.preventDefault();
            fetchApi("open-gh", {}, { app: name });
        }
    });
}

const updateAllBtn = qs<HTMLButtonElement>("#update-all-btn");

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