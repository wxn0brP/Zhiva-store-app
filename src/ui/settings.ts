import { uiMsg } from "@wxn0brp/flanker-dialog/msg/index";
import { fetchApiJson, fetchApiPost } from "@wxn0brp/zhiva-base-lib/front/api";
import { IS_DESKTOP_APP } from "../api";
import { initCdfCheckBox } from "./cdf";

const settingsContainer = qs<HTMLDivElement>("#settings");
const saveButton = qs<HTMLButtonElement>("#save-shortcuts-btn");
const openSettings = qs<HTMLButtonElement>("#open-settings");

export const store = initCdfCheckBox(settingsContainer);

async function loadPreferences() {
    const data = await fetchApiJson("shortcut-pref");
    if (!data.err && data.data) {
        store.menu.set(data.data.includes("m"));
        store.desktop.set(data.data.includes("d"));
        store.not.set(data.data.includes("n"));
    } else {
        store.menu.set(false);
        store.desktop.set(false);
        store.not.set(false);
    }
    if (data.err) {
        console.error("Failed to load shortcut preferences:", data);
        uiMsg(`Error`);
    }
}

async function savePreferences() {
    let prefs = "";
    if (store.desktop.get()) prefs += "d";
    if (store.menu.get()) prefs += "m";
    if (store.not.get()) prefs = "n";

    saveButton.disabled = true;
    const res = await fetchApiPost("shortcut-pref", {
        data: prefs
    });
    if (res.err) {
        console.error("Failed to save shortcut preferences:", res);
        uiMsg(`Error`);
        return
    }
    uiMsg("💜 Preferences saved!");
    saveButton.disabled = false;
}

export function initSettings() {
    if (!IS_DESKTOP_APP) return;

    saveButton.addEventListener("click", savePreferences);
    settingsContainer.fade = false;
    openSettings.addEventListener("click", () => settingsContainer.fadeToggle());

    loadPreferences();
}
