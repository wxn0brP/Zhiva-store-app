import "@wxn0brp/flanker-dialog/style.css";
import "@wxn0brp/flanker-ui/html";
import { fetchApi } from "./api";
import { initSettings } from "./ui/settings";
import { checkForUpdates } from "./ui/update/check";
import { updateInstalled } from "./ui/update/update";
import { appsToUpdateCount, updateStatus, zhivaInstalled } from "./ui/vars";
import { zhivaRepoListView } from "./ui/view";

fetchApi("installed").then(res => res.json()).then((data) => {
    if (data.err) return;
    zhivaInstalled.set(data.apps);
    updateInstalled();
});

checkForUpdates();
initSettings();

appsToUpdateCount.subscribe(count => {
    if (count < 0) return appsToUpdateCount.set(0);
    if (!count) return updateStatus.innerHTML = "No updates available";
    updateStatus.innerHTML = `Updates available for: ${count} app${count === 1 ? "" : "s"}.`;
});

zhivaRepoListView.load();
