// @ts-ignore
import "@wxn0brp/flanker-dialog/style.css";
import "@wxn0brp/flanker-ui/html";
import { fetchApi } from "./api";
import { initSettings } from "./ui/settings";
import { checkForUpdates } from "./ui/update/check";
import { updateInstalled } from "./ui/update/update";
import { appsToUpdateCount, updateStatus, zhivaInstalled } from "./ui/vars";
import { zhivaRepoListView } from "./ui/view";

async function init() {
	try {
		const [installedRes] = await Promise.all([
			fetchApi("installed"),
			zhivaRepoListView.load(),
		]);

		const data = await installedRes.json();
		if (!data.err) {
			zhivaInstalled.set(data.apps);
		}
		updateInstalled();

		checkForUpdates().catch(err =>
			console.error("checkForUpdates failed", err),
		);
	} catch (err) {
		console.error("Store initialization failed", err);
	}
}

init();
initSettings();

appsToUpdateCount.subscribe(count => {
	if (count < 0) return appsToUpdateCount.set(0);
	if (!count) return (updateStatus.innerHTML = "No updates available");
	updateStatus.innerHTML = `Updates available for: ${count} app${count === 1 ? "" : "s"}.`;
});

zhivaRepoListView.load();
