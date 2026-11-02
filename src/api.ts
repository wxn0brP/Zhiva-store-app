import { fetchApi as realFetchApi } from "@wxn0brp/zhiva-base-lib/front/api";
import { mockFetchApi } from "./ui/api-mock";

export const IS_DESKTOP_APP =
	typeof (window as any).zhiva_isApp !== "undefined";
export const fetchApi = IS_DESKTOP_APP ? realFetchApi : mockFetchApi;
