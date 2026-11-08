import { uiMsg } from "@wxn0brp/flanker-dialog/msg/index";
import { updateCell } from "@wxn0brp/flanker-ui/storeUtils";
import { fetchApi, IS_DESKTOP_APP } from "../../api";
import { log, timer } from "../../log";
import { showConfirmation, store } from "../confirm";
import { DISABLED_TITLE, pendingUpdates, zhivaInstalled } from "../vars";

let isUpdatingAll = false;

async function installApp(name: string) {
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
}

async function refreshInstalled() {
	const data = await fetchApi("installed")
		.then(res => res.json())
		.catch(() => null);
	if (!data || data.err) return;
	zhivaInstalled.set(data.apps ?? []);
}

function cardName(card: HTMLElement) {
	return card.getAttribute("data-name");
}

function clearPendingUpdate(name: string) {
	pendingUpdates.set(pendingUpdates.get().filter(app => app !== name));
}

export function updateInstalled() {
	const installed = zhivaInstalled.get();
	const updates = pendingUpdates.get();

	document.querySelectorAll<HTMLDivElement>(".repo-card").forEach(card => {
		const name = cardName(card);
		if (!name) return;

		const isInstalled = installed.includes(name);
		const installedEl = card.qs(".installed");
		if (installedEl)
			installedEl.innerHTML = isInstalled ? "💜 Installed" : "❌ Not Installed";

		const installBtn = card.qs<HTMLButtonElement>(".install");
		const uninstallBtn = card.qs<HTMLButtonElement>(".uninstall");
		const openInFileExplorerBtn = card.qs<HTMLButtonElement>(".open-dir");
		const startBtn = card.qs<HTMLButtonElement>(".start");
		const updateBadge = card.qs<HTMLElement>(".update-badge");

		const hasUpdate = updates.includes(name);
		card.classList.toggle("has-update", hasUpdate);
		if (updateBadge) updateBadge.hidden = !hasUpdate;

		if (isInstalled && IS_DESKTOP_APP) {
			installBtn.textContent = "Update";
			installBtn.disabled = false;
			uninstallBtn.style.display = "";
			openInFileExplorerBtn.style.display = "";
		} else {
			installBtn.textContent = "Install";
			installBtn.disabled = false;
			uninstallBtn.style.display = "none";
			openInFileExplorerBtn.style.display = "none";
		}

		startBtn.style.display = isInstalled || !IS_DESKTOP_APP ? "" : "none";
	});
}

export function handleInstallClick(card: HTMLElement) {
	const name = cardName(card);
	if (!name) return;

	const installBtn = card.qs<HTMLButtonElement>(".install");
	if (!installBtn || installBtn.disabled) return;

	if (zhivaInstalled.get().includes(name) && IS_DESKTOP_APP) {
		updateApp(card, name).catch(err =>
			log.error("Z-STORE-5-04", "update failed", {
				app: name,
				msg: err?.message,
			}),
		);
		return;
	}

	const isVerified = card.getAttribute("data-verified") === "true";
	showConfirmation(
		`Are you sure you want to install ${name}?`,
		async () => {
			if (isUpdatingAll) return;
			installBtn.disabled = true;
			installBtn.textContent = "Installing...";

			try {
				const result = await installApp(name);
				if (result.err) {
					uiMsg(`Install failed: ${result.msg ?? "unknown error"}`);
					return;
				}

				if (IS_DESKTOP_APP) await refreshInstalled();
				else
					updateCell(zhivaInstalled, apps =>
						apps.includes(name)
							? apps
							: [
									...apps,
									name,
								],
					);
				updateInstalled();
			} finally {
				installBtn.disabled = false;
				updateInstalled();
			}
		},
		{
			showWarning: !isVerified,
			shortcutOptions: true,
		},
	);
}

async function updateApp(card: HTMLElement, name: string) {
	if (isUpdatingAll) return;

	const installBtn = card.qs<HTMLButtonElement>(".install");
	if (!installBtn || installBtn.disabled) return;

	installBtn.disabled = true;
	installBtn.textContent = "Updating...";

	try {
		const result = await installApp(name);
		if (result.err) {
			uiMsg(`Update failed: ${result.msg ?? "unknown error"}`);
			return;
		}

		clearPendingUpdate(name);
		await refreshInstalled();
		updateInstalled();
		uiMsg("💜 Updated");
	} finally {
		installBtn.disabled = false;
		updateInstalled();
	}
}

export function handleUninstallClick(card: HTMLElement) {
	const name = cardName(card);
	if (!name) return;

	const installBtn = card.qs<HTMLButtonElement>(".install");
	if (installBtn?.disabled) return;

	showConfirmation(`Are you sure you want to uninstall ${name}?`, async () => {
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
		updateCell(zhivaInstalled, apps => apps.filter(app => app !== name));
		clearPendingUpdate(name);
		updateInstalled();
	});
}

export async function handleStartClick(card: HTMLElement) {
	const name = cardName(card);
	if (!name) return;

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
}

export function handleOpenDirClick(card: HTMLElement) {
	const name = cardName(card);
	if (!name) return;

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

export function handleOpenGhClick(card: HTMLElement) {
	const name = cardName(card);
	if (!name) return;
	openGH(name);
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
		pendingUpdates.set([]);
		await refreshInstalled();
		updateInstalled();
	} catch (err: any) {
		log.error("Z-STORE-5-04", "update all failed", {
			msg: err?.message,
			ms: elapsed(),
		});
	} finally {
		updateAllBtn.disabled = false;
		updateAllBtn.textContent = "Update All";
		isUpdatingAll = false;
	}
};
