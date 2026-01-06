import { fetchApi as realFetchApi } from "@wxn0brp/zhiva-base-lib/front/api";
import { mockFetchApi } from "./ui/api-mock";

export const IS_DESKTOP_APP = typeof (window as any).zhiva_isApp !== "undefined";
console.log("Running in", IS_DESKTOP_APP ? "desktop" : "browser mode");
export const fetchApi = IS_DESKTOP_APP ? realFetchApi : mockFetchApi;

if (IS_DESKTOP_APP) {
    console.log("[ZHIVA] Desktop app detected");
    window.addEventListener("message", (event) => {
        console.log("[ZHIVA] Received message", event.data);
        if (event.data && event.data.type === "open-link") {
            (window as any).zhiva_openExternal(event.data.url);
        }
    });
}