import { ReactiveCell } from "@wxn0brp/flanker-ui";

export const gitRaw = "https://raw.githubusercontent.com/";
export const zhivaInstalled = new ReactiveCell<string[]>([]);
export const appsToUpdateCount = new ReactiveCell(0);
export const updateStatus = qs("#update-status");
export const DISABLED_TITLE = "Available only in desktop app";
