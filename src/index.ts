import { createLockPlugin } from "@wxn0brp/db-lock";
import { Valthera } from "@wxn0brp/db/valthera";
import { apiRouter } from "@wxn0brp/zhiva-base-lib/api";
import { app, oneWindow } from "@wxn0brp/zhiva-base-lib/server";
import { $ } from "bun";
import { exec } from "child_process";
import { join } from "path";
import { log, timer } from "./log";

app.static("public", {
	errorIfDirNotFound: false,
});
app.static("dist", {
	errorIfDirNotFound: false,
});
app.static(".");

const zhivaBin = process.env.ZHIVA_ROOT + "/bin/zhiva";
const db = new Valthera(process.env.ZHIVA_ROOT + "/master.db");
db.plugin(createLockPlugin());

function noApp() {
	log.warn("Z-STORE-1-90", "request without app parameter");
	return {
		err: true,
		msg: "No app specified",
	};
}

function parseJson<T>(raw: string, fallback: T): T {
	try {
		return JSON.parse(raw) as T;
	} catch (error: any) {
		log.error("Z-STORE-2-03", "invalid JSON from zhiva CLI", {
			msg: error?.message,
			raw: raw.slice(0, 200),
		});
		return fallback;
	}
}

async function runZhiva(action: string, args: string[]) {
	const elapsed = timer();
	try {
		const result = await $`${zhivaBin} ${args}`.quiet();
		log.info("Z-STORE-2-01", `${action} ok`, {
			ms: elapsed(),
			exit: result.exitCode,
		});
		return {
			err: false as const,
			stdout: result.stdout.toString(),
		};
	} catch (error: any) {
		const stderr = error?.stderr ? error.stderr.toString().trim() : "";
		const msg = stderr || error?.message || "Command failed";
		log.error("Z-STORE-2-02", `${action} failed`, {
			ms: elapsed(),
			msg,
		});
		return {
			err: true as const,
			msg,
			stdout: "",
		};
	}
}

apiRouter.get("/install", async req => {
	const appName = req.query.app;
	if (!appName) return noApp();

	const shortcut = req.query.shortcut;
	const prefs = shortcut
		? [
				"-s",
				shortcut,
			]
		: [];
	const elapsed = timer();

	log.info("Z-STORE-1-05", "install start", {
		app: appName,
		shortcut: shortcut ?? null,
	});

	const res = await runZhiva(`install ${appName}`, [
		"install",
		appName,
		...prefs,
	]);
	if (res.err)
		return {
			err: true,
			msg: res.msg,
		};

	log.info("Z-STORE-1-05", "install ok", {
		app: appName,
		ms: elapsed(),
	});
	return {
		err: false,
	};
});

apiRouter.get("/uninstall", async req => {
	let appName = req.query.app;
	if (!appName) return noApp();

	if (!appName.includes("/")) appName = `wxn0brP/${appName}`;
	const exists = db.findOne({
		collection: "apps",
		search: {
			name: appName,
		},
	});

	if (!exists) {
		log.warn("Z-STORE-1-06", "uninstall aborted", {
			app: appName,
			reason: "App not found",
		});
		return {
			err: true,
			msg: "App not found",
		};
	}

	log.info("Z-STORE-1-06", "uninstall start", {
		app: appName,
	});
	const res = await runZhiva(`uninstall ${appName}`, [
		"uninstall",
		appName,
	]);
	if (res.err)
		return {
			err: true,
			msg: res.msg,
		};

	log.info("Z-STORE-1-06", "uninstall ok", {
		app: appName,
	});
	return {
		err: false,
	};
});

apiRouter.get("/installed", async () => {
	const elapsed = timer();
	try {
		const apps = await db.find({
			collection: "apps",
		});
		log.info("Z-STORE-1-02", "/installed ok", {
			count: apps.length,
			ms: elapsed(),
		});
		return {
			apps: apps.map(app => app.name),
		};
	} catch (error: any) {
		log.error("Z-STORE-1-02", "/installed failed", {
			msg: error?.message,
			ms: elapsed(),
		});
		return {
			err: true,
			msg: error?.message ?? "Failed to read installed apps",
		};
	}
});

apiRouter.get("/start", async req => {
	const appName = req.query.app;
	if (!appName) return noApp();

	log.info("Z-STORE-1-07", "start", {
		app: appName,
	});
	const res = await runZhiva(`start ${appName}`, [
		"start",
		appName,
	]);
	if (res.err)
		return {
			err: true,
			msg: res.msg,
		};

	log.info("Z-STORE-1-07", "start ok", {
		app: appName,
	});
	return {
		err: false,
	};
});

apiRouter.get("/update", async () => {
	const elapsed = timer();
	log.info("Z-STORE-1-04", "update start");
	const res = await runZhiva("update", [
		"update",
	]);
	if (res.err)
		return {
			err: true,
			msg: res.msg,
		};

	log.info("Z-STORE-1-04", "update ok", {
		ms: elapsed(),
	});
	return {
		err: false,
	};
});

apiRouter.get("/get-updates", async () => {
	const elapsed = timer();
	const res = await runZhiva("update --json", [
		"update",
		"--json",
	]);
	if (res.err)
		return {
			err: true,
			msg: res.msg,
		};

	const updates = parseJson<Record<string, boolean>>(res.stdout, {});
	const pending = Object.keys(updates).filter(name => updates[name]);

	log.info("Z-STORE-1-03", "/get-updates ok", {
		pending: pending.length,
		apps: pending,
		ms: elapsed(),
	});
	return {
		err: false,
		updates,
	};
});

apiRouter.get("/apps", async () => {
	const elapsed = timer();
	const res = await runZhiva("search --json", [
		"search",
		"--json",
	]);
	if (res.err)
		return {
			err: true,
			msg: res.msg,
		};

	const apps = parseJson<any>(res.stdout, []);
	if (!Array.isArray(apps)) {
		log.error("Z-STORE-2-03", "search returned non-array", {
			type: typeof apps,
		});
		return {
			err: true,
			msg: "Unexpected response from zhiva search",
		};
	}

	log.info("Z-STORE-1-01", "/apps ok", {
		count: apps.length,
		names: apps.map(item => item?.name),
		ms: elapsed(),
	});
	return {
		err: false,
		apps,
	};
});

apiRouter.get("/open-dir", async req => {
	try {
		let appName = req.query.app;
		if (!appName) return noApp();

		if (!appName.includes("/")) appName = `wxn0brP/${appName}`;

		const path = join(process.env.ZHIVA_ROOT, "apps", appName);
		log.info("Z-STORE-1-08", "open-dir", {
			app: appName,
			path,
			platform: process.platform,
		});

		switch (process.platform) {
			case "win32":
				exec(`explorer "${path}"`);
				break;
			case "darwin":
				await $`open ${path}`.quiet();
				break;
			case "linux":
				await $`xdg-open ${path}`.quiet();
				break;
			default:
				log.warn("Z-STORE-1-08", "open-dir unsupported platform", {
					platform: process.platform,
				});
				return {
					err: true,
					msg: "Unsupported platform",
				};
		}

		log.info("Z-STORE-1-08", "open-dir ok", {
			app: appName,
		});
		return {
			err: false,
		};
	} catch (error: any) {
		log.error("Z-STORE-1-08", "open-dir failed", {
			msg: error?.message,
		});
		return {
			err: true,
			msg: error?.message,
		};
	}
});

apiRouter.get("/shortcut-pref", async () => {
	try {
		const data = await db.findOne<any>({
			collection: "pref",
			search: {
				_id: "shortcut",
			},
		});
		log.debug("Z-STORE-1-09", "/shortcut-pref ok", {
			value: data?.v ?? null,
		});
		return {
			err: false,
			data: data?.v,
		};
	} catch (error: any) {
		log.error("Z-STORE-1-09", "/shortcut-pref failed", {
			msg: error?.message,
		});
		return {
			err: true,
			msg: error?.message,
		};
	}
});

apiRouter.post("/shortcut-pref", async req => {
	try {
		const data = req.body.data;
		if (!data) {
			await db.removeOne({
				collection: "pref",
				search: {
					_id: "shortcut",
				},
			});
			log.info("Z-STORE-1-10", "/shortcut-pref cleared");
			return {
				err: false,
			};
		}
		await db.updateOneOrAdd({
			collection: "pref",
			search: {
				_id: "shortcut",
			},
			updater: {
				v: data,
			},
		});
		log.info("Z-STORE-1-10", "/shortcut-pref saved", {
			value: data,
		});
		return {
			err: false,
		};
	} catch (error: any) {
		log.error("Z-STORE-1-10", "/shortcut-pref save failed", {
			msg: error?.message,
		});
		return {
			err: true,
			msg: error?.message,
		};
	}
});

oneWindow();
