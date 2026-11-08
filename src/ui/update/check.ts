import { fetchApi, IS_DESKTOP_APP } from "../../api";
import { log, timer } from "../../log";
import { pendingUpdates, updateStatus } from "../vars";
import { updateInstalled } from "./update";

export async function checkForUpdates() {
	const elapsed = timer();
	checkUpdatesBtn.disabled = true;
	updateStatus.innerHTML = "Checking...";

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
		pendingUpdates.set(appsToUpdate);
		updateInstalled();

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
};
