import { Valthera } from "@wxn0brp/db";
import { createLock } from "@wxn0brp/db-lock";
import { app, waitToStart } from "@wxn0brp/zhiva-base-lib/index";
import { openWindow } from "@wxn0brp/zhiva-base-lib/openWindow";
import { execSync } from "child_process";
import { randomBytes } from "crypto";

app.static("public");
app.static("dist");
const token = randomBytes(32).toString("hex");
const port = await waitToStart();
const window = openWindow(port + "/?auth=" + token);
window.on("close", () => process.exit(0));

const zhivaBin = process.env.ZHIVA_ROOT + "/bin/zhiva";
const db = createLock(new Valthera(process.env.ZHIVA_ROOT + "/master.db"));

const api = app.router("/api");
api.use((req, res, next) => {
    if (req.query.auth !== token) return res.status(401).send("Unauthorized");
    next();
});

api.get("/install", (req) => {
    const app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    execSync(`${zhivaBin} install ${app}`, { stdio: "inherit" });

    return { err: false };
});

api.get("/uninstall", (req) => {
    let app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    if (!app.includes("/")) app = `wxn0brP/${app}`;
    const exists = db.findOne("apps", { name: app });

    if (!exists) return { err: true, msg: "App not found" };

    execSync(`${zhivaBin} uninstall ${app}`, { stdio: "inherit" });

    return { err: false };
});

api.get("/installed", async () => {
    const apps = await db.find("apps");
    return { apps: apps.map((app) => app.name) };
});

api.get("/start", (req) => {
    const app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    execSync(`${zhivaBin} start ${app}`, { stdio: "inherit" });
    return { err: false };
});

api.get("/open-gh", (req) => {
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

api.get("/update", () => {
    try {
        execSync(`${zhivaBin} update`, { stdio: "inherit" });
        return { err: false };
    } catch (error) {
        return { err: true, msg: error.message };
    }
});

api.get("/get-updates", () => {
    try {
        let data = execSync(`${zhivaBin} update try`).toString();
        const updates = JSON.parse(data.match(/\[JSON\](.*)\[\/JSON\]/)[1]);
        return { err: false, updates };
    } catch (error) {
        return { err: true, msg: error.message };
    }
})