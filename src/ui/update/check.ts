import { appsToUpdateCount, updateStatus } from "../vars";
import { fetchApi, IS_DESKTOP_APP } from "../../api";

export async function checkForUpdates() {
    checkUpdatesBtn.disabled = true;
    updateStatus.innerHTML = "Checking...";

    document.querySelectorAll(".repo-card").forEach(card => card.classList.remove("has-update"));

    const res = await fetchApi("get-updates");
    const data = await res.json();
    const updates = data.updates;
    checkUpdatesBtn.disabled = !IS_DESKTOP_APP;

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

const checkUpdatesBtn = qs<HTMLButtonElement>("#check-updates-btn");

if (!IS_DESKTOP_APP) {
    checkUpdatesBtn.disabled = true;
    checkUpdatesBtn.title = "";
}

checkUpdatesBtn.onclick = () => {
    checkForUpdates();
    localStorage.removeItem("reposCache");
}