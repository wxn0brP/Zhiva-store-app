import { fetchApi, IS_DESKTOP_APP } from "../../api";
import { log, timer } from "../../log";
import { appsToUpdateCount, updateStatus } from "../vars";

export async function checkForUpdates() {
	const elapsed = timer();
	checkUpdatesBtn.disabled = true;
	updateStatus.innerHTML = "Checking...";

	document
		.querySelectorAll(".repo-card")
		.forEach(card => card.classList.remove("has-update"));

	try {
		const res = await fetchApi("get-updates");
		const data = await res.json();

		if (data.err) {
			log.error("Z-STORE-5-01", "update check failed", {
				msg: data.msg,
			});
			updateStatus.innerHTML = `<span style="color: red;">Error checking for updates</span>`;
			return;
		}

		const updates = data.updates ?? {};
		const appsToUpdate = Object.keys(updates).filter(app => updates[app]);
		appsToUpdateCount.set(appsToUpdate.length);
		if (!appsToUpdate.length) updateStatus.innerHTML = "No updates available";

		appsToUpdate.forEach(appName => {
			const card = qs(`.repo-card[data-name="${appName}"]`);
			if (card) {
				card.classList.add("has-update");
				const updateBtn = card.qs<HTMLButtonElement>(".install");
				if (updateBtn) updateBtn.textContent = "Update available";
			}
		});

		log.info("Z-STORE-5-01", "updates checked", {
			pending: appsToUpdate.length,
			apps: appsToUpdate,
			ms: elapsed(),
		});
	} catch (err: any) {
		log.error("Z-STORE-5-01", "update check failed", {
			msg: err?.message,
		});
		updateStatus.innerHTML = `<span style="color: red;">Error checking for updates</span>`;
	} finally {
		checkUpdatesBtn.disabled = !IS_DESKTOP_APP;
	}
}

const checkUpdatesBtn = qs<HTMLButtonElement>("#check-updates-btn");

if (!IS_DESKTOP_APP) {
	checkUpdatesBtn.disabled = true;
	checkUpdatesBtn.title = "";
}

checkUpdatesBtn.onclick = () => {
	checkForUpdates().catch(err =>
		log.error("Z-STORE-5-01", "update check failed", err),
	);
	localStorage.removeItem("reposCache");
};
