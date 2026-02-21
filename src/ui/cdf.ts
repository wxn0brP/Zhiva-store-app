import { createStore } from "@wxn0brp/flanker-ui";
import { watchCheckbox } from "@wxn0brp/flanker-ui/component/helpers";

export function initCdfCheckBox(container: HTMLDivElement) {
    const store = createStore({
        desktop: false,
        menu: false,
        not: false,
    })

    const notCheckbox = container.qi("shortcut-not", 1);
    const desktopCheckbox = container.qi("shortcut-desktop", 1);
    const menuCheckbox = container.qi("shortcut-menu", 1);

    store.not.subscribe(v => {
        if (v) {
            desktopCheckbox.disabled = true;
            menuCheckbox.disabled = true;
            desktopCheckbox.checked = false;
            menuCheckbox.checked = false;
        } else {
            desktopCheckbox.disabled = false;
            menuCheckbox.disabled = false;
        }
    });

    watchCheckbox(desktopCheckbox, store.desktop);
    watchCheckbox(menuCheckbox, store.menu);
    watchCheckbox(notCheckbox, store.not);

    return store;
}
