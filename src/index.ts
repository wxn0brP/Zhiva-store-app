import { app, waitToStart } from "@wxn0brp/zhiva-base-lib/index";
import { openWindow } from "@wxn0brp/zhiva-base-lib/openWindow";
import { execSync } from "child_process";
import { randomBytes } from "crypto";
import { readdirSync } from "fs";

app.static("public");
app.static("dist");
const token = randomBytes(32).toString("hex");
const port = await waitToStart();
const window = openWindow(port + "/?auth=" + token);
window.on("close", () => process.exit(0));

const api = app.router("/api");
api.use((req, res, next) => {
    if (req.query.auth !== token) return res.status(401).send("Unauthorized");
    next();
});

api.get("/install", (req) => {
    const app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    execSync(`${process.env.ZHIVA_ROOT}/bin/zhiva install ${app}`, { stdio: "inherit" });

    return { err: false };
});

api.get("/installed", async () => {
    const dirs = readdirSync(`${process.env.ZHIVA_ROOT}/apps`);
    const apps = dirs.map((dir) => readdirSync(`${process.env.ZHIVA_ROOT}/apps/${dir}`).map((file) => `${dir}/${file}`));
    return { apps: apps.flat() };
});

api.get("/start", (req) => {
    const app = req.query.app;
    if (!app) return { err: true, msg: "No app specified" };

    execSync(`${process.env.ZHIVA_ROOT}/bin/zhiva start ${app}`, { stdio: "inherit" });
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