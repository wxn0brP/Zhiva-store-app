import { $ } from "bun";
import { copyFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const path = "node_modules/@wxn0brp/flanker-dialog/dist/style.css";

if (existsSync(path)) {
    copyFileSync(path, "dist/style.css");
    console.log("Copied style.css from node_modules");
} else {
    const zhivaPath = join(homedir(), ".zhiva", path);
    if (existsSync(zhivaPath)) {
        copyFileSync(zhivaPath, "dist/style.css");
        console.log("Copied style.css from ~/.zhiva");
    }
    else {
        await $`bun install @wxn0brp/flanker-dialog`;
        copyFileSync(path, "dist/style.css");
        console.log("Installed and copied style.css from node_modules");
    }
}
