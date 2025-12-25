import { Valthera } from "@wxn0brp/db";
import { createLock } from "@wxn0brp/db-lock";
import { apiRouter } from "@wxn0brp/zhiva-base-lib/api";
import { app, oneWindow } from "@wxn0brp/zhiva-base-lib/server";
import { execSync } from "child_process";

app.static("public");
app.static("dist");
await oneWindow();

const zhivaBin = process.env.ZHIVA_ROOT + "/bin/zhiva";
const db = createLock(new Valthera(process.env.ZHIVA_ROOT + "/master.db"));

apiRouter.get("/install", (req) => {
    const app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    execSync(`${zhivaBin} install ${app}`, { stdio: "inherit" });

    return { err: false };
});

apiRouter.get("/uninstall", (req) => {
    let app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    if (!app.includes("/")) app = `wxn0brP/${app}`;
    const exists = db.findOne("apps", { name: app });

    if (!exists) return { err: true, msg: "App not found" };

    execSync(`${zhivaBin} uninstall ${app}`, { stdio: "inherit" });

    return { err: false };
});

apiRouter.get("/installed", async () => {
    const apps = await db.find("apps");
    return { apps: apps.map((app) => app.name) };
});

apiRouter.get("/start", (req) => {
    const app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    execSync(`${zhivaBin} start ${app}`, { stdio: "inherit" });
    return { err: false };
});

apiRouter.get("/open-gh", (req) => {
    const app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    let cmd = "";
    switch (process.platform) {
        case "linux":
            cmd = "xdg-open";
            break;
        case "win32":
            cmd = `start ""`;
            break;
        case "darwin":
            cmd = "open";
            break;
        default:
            console.warn("Unsupported platform:", process.platform);
            return { err: true, msg: "Unsupported platform" };
    }
    execSync(`${cmd} https://github.com/${app}`, { stdio: "inherit" });
    return { err: false };
});

apiRouter.get("/update", () => {
    try {
        execSync(`${zhivaBin} update`, { stdio: "inherit" });
        return { err: false };
    } catch (error) {
        return { err: true, msg: error.message };
    }
});

apiRouter.get("/get-updates", () => {
    try {
        const data = execSync(`${zhivaBin} update --json`).toString();
        return { err: false, updates: JSON.parse(data) };
    } catch (error) {
        return { err: true, msg: error.message };
    }
})