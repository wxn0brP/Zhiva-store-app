// @ts-ignore
import "@wxn0brp/flanker-dialog/style.css";
import "@wxn0brp/flanker-ui/html";
import { fetchApi, IS_DESKTOP_APP } from "./api";
import { log, timer } from "./log";
import { initSettings } from "./ui/settings";
import { checkForUpdates } from "./ui/update/check";
import { updateInstalled } from "./ui/update/update";
import { appsToUpdateCount, updateStatus, zhivaInstalled } from "./ui/vars";
import { zhivaRepoListView } from "./ui/view";

async function init() {
	const elapsed = timer();
	log.info("Z-STORE-3-01", "init", {
		mode: IS_DESKTOP_APP ? "desktop" : "browser",
	});

	try {
		const [installedRes] = await Promise.all([
			fetchApi("installed"),
			zhivaRepoListView.load(),
		]);

		const data = await installedRes.json();
		if (data.err) {
			log.warn("Z-STORE-3-03", "installed list failed", {
				msg: data.msg,
			});
		} else {
			zhivaInstalled.set(data.apps ?? []);
		}
		updateInstalled();

		log.info("Z-STORE-3-04", "installed loaded", {
			count: zhivaInstalled.get().length,
			ms: elapsed(),
		});

		checkForUpdates().catch(err =>
			log.error("Z-STORE-5-01", "update check failed", err),
		);
	} catch (err) {
		log.error("Z-STORE-3-02", "init failed", err);
	}
}

init();
initSettings();

appsToUpdateCount.subscribe(count => {
	if (count < 0) return appsToUpdateCount.set(0);
	if (!count) return (updateStatus.innerHTML = "No updates available");
	updateStatus.innerHTML = `Updates available for: ${count} app${count === 1 ? "" : "s"}.`;
});
