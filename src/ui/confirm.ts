const modal = qs("#confirmation-modal");
const modalMessage = qs<HTMLParagraphElement>("#modal-message");
const modalWarning = qs("#modal-warning");
const modalConfirm = qs<HTMLButtonElement>("#modal-confirm");
const modalCancel = qs<HTMLButtonElement>("#modal-cancel");

export function showConfirmation(message: string, showWarning: boolean, onConfirm: () => void) {
    if (!modal || !modalMessage || !modalWarning || !modalConfirm || !modalCancel) return;

    modalMessage.textContent = message;
    modalWarning.style.display = showWarning ? "block" : "none";
    modal.style.display = "flex";

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