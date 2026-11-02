import { uiMsg } from "@wxn0brp/flanker-dialog/msg/index";
import { incrementCell, updateCell } from "@wxn0brp/flanker-ui/storeUtils";
import { fetchApi, IS_DESKTOP_APP } from "../../api";
import { log, timer } from "../../log";
import { showConfirmation, store } from "../confirm";
import { appsToUpdateCount, DISABLED_TITLE, zhivaInstalled } from "../vars";

let isUpdatingAll = false;

export function updateInstalled() {
	document.querySelectorAll<HTMLDivElement>(".repo-card").forEach(card => {
		const name = card.getAttribute("data-name");

		const installFn = async () => {
			let pref = "";

			if (store.desktop.get()) pref += "d";
			if (store.menu.get()) pref += "m";
			if (store.not.get()) pref = "n";

			const query: Record<string, string> = {
				app: name,
			};

			if (pref) query.shortcut = pref;

			log.info("Z-STORE-5-02", "install start", {
				app: name,
				shortcut: pref || null,
			});

			const data = await fetchApi("install", {}, query)
				.then(res => res.json())
				.catch((error: any) => ({
					err: true,
					msg: error?.message,
				}));

			if (data.err) {
				log.error("Z-STORE-5-04", "install failed", {
					app: name,
					msg: data.msg,
				});
				return {
					err: true,
					msg: data.msg,
				};
			}

			log.info("Z-STORE-5-02", "install ok", {
				app: name,
			});
			return {
				err: false,
			};
		};

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
				const result = await installFn();
				installBtn.textContent = "Update";
				installBtn.disabled = false;
				if (result.err) {
					uiMsg(`Update failed: ${result.msg ?? "unknown error"}`);
					return;
				}
				uiMsg("💜 Updated");
				card.clR("has-update");
				incrementCell(appsToUpdateCount, -1);
			};

			uninstallBtn.style.display = "";
			uninstallBtn.onclick = () => {
				if (installBtn.disabled) return;
				showConfirmation(
					`Are you sure you want to uninstall ${name}?`,
					async () => {
						log.info("Z-STORE-5-03", "uninstall start", {
							app: name,
						});
						const data = await fetchApi(
							"uninstall",
							{},
							{
								app: name,
							},
						)
							.then(res => res.json())
							.catch((error: any) => ({
								err: true,
								msg: error?.message,
							}));

						if (data.err) {
							log.error("Z-STORE-5-04", "uninstall failed", {
								app: name,
								msg: data.msg,
							});
							uiMsg(`Uninstall failed: ${data.msg ?? "unknown error"}`);
							return;
						}

						log.info("Z-STORE-5-03", "uninstall ok", {
							app: name,
						});
						updateCell(zhivaInstalled, apps =>
							apps.filter(app => app !== name),
						);
						updateInstalled();
					},
				);
			};

			openInFileExplorerBtn.style.display = "";
			openInFileExplorerBtn.onclick = () => {
				openInFileExplorer(name);
			};
		} else {
			installBtn.innerHTML = "Install";
			installBtn.onclick = () => {
				const isVerified = card.getAttribute("data-verified") === "true";
				showConfirmation(
					`Are you sure you want to install ${name}?`,
					async () => {
						if (isUpdatingAll) return;
						installBtn.disabled = true;
						installBtn.textContent = "Installing...";
						const result = await installFn();
						installBtn.textContent = "Install";
						installBtn.disabled = false;
						if (result.err) {
							uiMsg(`Install failed: ${result.msg ?? "unknown error"}`);
							return;
						}
						updateCell(zhivaInstalled, apps => [
							...apps,
							name,
						]);
						updateInstalled();
					},
					{
						showWarning: !isVerified,
						shortcutOptions: true,
					},
				);
			};

			uninstallBtn.style.display = "none";
			openInFileExplorerBtn.style.display = "none";
		}

		const startBtn = card.qs<HTMLButtonElement>(".start");
		startBtn.style.display = installed || !IS_DESKTOP_APP ? "" : "none";

		startBtn.onclick = async () => {
			log.info("Z-STORE-5-03", "start", {
				app: name,
			});
			const data = await fetchApi(
				"start",
				{},
				{
					app: name,
				},
			)
				.then(res => res.json())
				.catch((error: any) => ({
					err: true,
					msg: error?.message,
				}));

			if (data.err)
				log.error("Z-STORE-5-04", "start failed", {
					app: name,
					msg: data.msg,
				});
		};

		card.qs(".open-gh").onclick = () => {
			openGH(name);
		};
	});
}

function openGH(name: string) {
	const url = "https://github.com/" + name;
	if (
		IS_DESKTOP_APP &&
		typeof (window as any).zhiva_openExternal === "function"
	)
		(window as any).zhiva_openExternal(url);
	else window.open(url, "_blank");
}

const updateAllBtn = qs<HTMLButtonElement>("#update-all-btn");

if (!IS_DESKTOP_APP) {
	updateAllBtn.disabled = true;
	updateAllBtn.title = DISABLED_TITLE;
}

updateAllBtn.onclick = async () => {
	const elapsed = timer();
	isUpdatingAll = true;
	updateAllBtn.disabled = true;
	updateAllBtn.textContent = "Updating...";
	log.info("Z-STORE-5-02", "update all start");

	try {
		const res = await fetchApi("update");
		const data = await res.json();

		updateAllBtn.disabled = false;
		updateAllBtn.textContent = "Update All";

		if (data.err) {
			log.error("Z-STORE-5-04", "update all failed", {
				msg: data.msg,
				ms: elapsed(),
			});
			uiMsg(`Error updating apps: ${data.msg}`);
			return;
		}

		log.info("Z-STORE-5-02", "update all ok", {
			ms: elapsed(),
		});
		uiMsg("💜 Apps updated successfully!");
		document
			.querySelectorAll(".repo-card")
			.forEach(card => card.classList.remove("has-update"));

		const zhivaInstalledData = await fetchApi("installed").then(res =>
			res.json(),
		);
		if (zhivaInstalledData.err) return;
		zhivaInstalled.set(zhivaInstalledData.apps);
		updateInstalled();
	} catch (err: any) {
		log.error("Z-STORE-5-04", "update all failed", {
			msg: err?.message,
			ms: elapsed(),
		});
		updateAllBtn.disabled = false;
		updateAllBtn.textContent = "Update All";
	} finally {
		isUpdatingAll = false;
	}
};

function openInFileExplorer(name: string) {
	log.debug("Z-STORE-5-03", "open-dir", {
		app: name,
	});
	fetchApi(
		"open-dir",
		{},
		{
			app: name,
		},
	).catch(err => log.error("Z-STORE-5-04", "open-dir failed", err));
}
