import { Valthera } from "@wxn0brp/db";
import { createLock } from "@wxn0brp/db-lock";
import { apiRouter } from "@wxn0brp/zhiva-base-lib/api";
import { app, oneWindow } from "@wxn0brp/zhiva-base-lib/server";
import { $ } from "bun";
import { exec } from "child_process";
import { join } from "path";

app.static("public");
app.static("dist");

const zhivaBin = process.env.ZHIVA_ROOT + "/bin/zhiva";
const db = createLock(new Valthera(process.env.ZHIVA_ROOT + "/master.db"));

apiRouter.get("/install", async (req) => {
    const app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    await $`${zhivaBin} install ${app}`;

    return { err: false };
});

apiRouter.get("/uninstall", async (req) => {
    let app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    if (!app.includes("/")) app = `wxn0brP/${app}`;
    const exists = db.findOne("apps", { name: app });

    if (!exists) return { err: true, msg: "App not found" };

    await $`${zhivaBin} uninstall ${app}`, { stdio: "inherit" };

    return { err: false };
});

apiRouter.get("/installed", async () => {
    const apps = await db.find("apps");
    return { apps: apps.map((app) => app.name) };
});

apiRouter.get("/start", async (req) => {
    const app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    await $`${zhivaBin} start ${app}`;
    return { err: false };
});

apiRouter.get("/update", async () => {
    try {
        await $`${zhivaBin} update`;
        return { err: false };
    } catch (error) {
        return { err: true, msg: error.message };
    }
});

apiRouter.get("/get-updates", async () => {
    try {
        const { stdout } = await $`${zhivaBin} update --json`;
        const data = stdout.toString();
        return { err: false, updates: JSON.parse(data) };
    } catch (error) {
        return { err: true, msg: error.message };
    }
});

apiRouter.get("/apps", async () => {
    try {
        const { stdout } = await $`${zhivaBin} search --json`;
        const data = stdout.toString();
        return { err: false, apps: JSON.parse(data) };
    } catch (error) {
        return { err: true, msg: error.message };
    }
});

apiRouter.get("/open-dir", async (req) => {
    try {
        let appName = req.query.app;
        if (!appName) return { err: true, msg: "No app specified" };

        if (!appName.includes("/")) appName = `wxn0brP/${appName}`;

        const path = join(process.env.ZHIVA_ROOT, "apps", appName);

        switch (process.platform) {
            case "win32":
                exec(`explorer "${path}"`);
                break;
            case "darwin":
                await $`open "${path}"`;
                break;
            case "linux":
                await $`xdg-open "${path}"`;
                break;
            default:
                return { err: true, msg: "Unsupported platform" };
        }

        return { err: false };
    } catch (error) {
        return { err: true, msg: error.message };
    }
});

oneWindow();