import { initCdfCheckBox } from "./cdf";
import { store as settingsStore } from "./settings";

const modal = qs("#confirmation-modal");
const modalMessage = qs<HTMLParagraphElement>("#modal-message");
const modalWarning = qs("#modal-warning");
const modalConfirm = qs<HTMLButtonElement>("#modal-confirm");
const modalCancel = qs<HTMLButtonElement>("#modal-cancel");
const shortcutOptions = modal.qs(".shortcut-options");

export interface Opts {
    showWarning: boolean;
    shortcutOptions: boolean;
}

export const store = initCdfCheckBox(modal);

export function showConfirmation(message: string, onConfirm: () => void, options: Partial<Opts> = {}) {
    if (!modal || !modalMessage || !modalWarning || !modalConfirm || !modalCancel) return;

    const opts = {
        showWarning: false,
        ...options
    }

    modalMessage.textContent = message;
    modalWarning.style.display = opts.showWarning ? "block" : "none";
    modal.style.display = "flex";

    if (opts.shortcutOptions) {
        shortcutOptions.style.display = "";
        store.set(settingsStore.get());
    } else {
        shortcutOptions.style.display = "none";
    }

    const confirmHandler = () => {
        onConfirm();
        hideModal();
    }

    const cancelHandler = () => {
        hideModal();
    }

    const hideModal = () => {
        modal.style.display = "none";
        modalConfirm.removeEventListener("click", confirmHandler);
        modalCancel.removeEventListener("click", cancelHandler);
    }

    modalConfirm.addEventListener("click", confirmHandler);
    modalCancel.addEventListener("click", cancelHandler);
}