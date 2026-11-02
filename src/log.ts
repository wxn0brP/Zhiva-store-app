type Level = "debug" | "info" | "warn" | "error";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

const AREA_COLORS: Record<string, string> = {
	"1": "\x1b[36m",
	"2": "\x1b[33m",
	"3": "\x1b[35m",
	"4": "\x1b[34m",
	"5": "\x1b[32m",
	"6": "\x1b[37m",
};

const LEVEL_COLORS: Record<Level, string> = {
	debug: "\x1b[90m",
	info: "\x1b[36m",
	warn: "\x1b[33m",
	error: "\x1b[31m",
};

const LEVEL_LABELS: Record<Level, string> = {
	debug: "DBG",
	info: "INF",
	warn: "WRN",
	error: "ERR",
};

function timestamp() {
	const now = new Date();
	const pad = (value: number, size = 2) => String(value).padStart(size, "0");
	return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
}

function serialize(value: any, depth = 0): string {
	if (value === undefined) return "undefined";
	if (value === null) return "null";
	if (typeof value === "string")
		return depth === 0 ? value : JSON.stringify(value);
	if (
		typeof value === "number" ||
		typeof value === "boolean" ||
		typeof value === "bigint"
	)
		return String(value);
	if (value instanceof Error) return `${value.name}: ${value.message}`;
	if (Array.isArray(value)) {
		if (value.length === 0) return "[]";
		const max = 8;
		const items = value.slice(0, max).map(item => serialize(item, depth + 1));
		const rest = value.length - items.length;
		return `[ ${items.join(", ")}${rest > 0 ? `, +${rest}` : ""} ]`;
	}
	if (typeof value === "object") {
		const keys = Object.keys(value);
		if (keys.length === 0) return "{}";
		const max = 12;
		const entries = keys
			.slice(0, max)
			.map(key => `${key}=${serialize(value[key], depth + 1)}`);
		const rest = keys.length - entries.length;
		return `{ ${entries.join(", ")}${rest > 0 ? `, +${rest}` : ""} }`;
	}
	return String(value);
}

function areaColor(code: string) {
	const area = code.match(/^Z-STORE-(\d+)/)?.[1] ?? "";
	return AREA_COLORS[area] ?? "\x1b[37m";
}

function write(level: Level, code: string, message: string, data?: any) {
	const time = `${DIM}${timestamp()}${RESET}`;
	const label = `${LEVEL_COLORS[level]}${LEVEL_LABELS[level]}${RESET}`;
	const tag = `${BOLD}${areaColor(code)}[${code}]${RESET}`;
	const details = data === undefined ? "" : ` ${DIM}${serialize(data)}${RESET}`;
	const line = `${time} ${label} ${tag} ${message}${details}`;

	if (level === "error") console.error(line);
	else if (level === "warn") console.warn(line);
	else console.log(line);
}

export const log = {
	debug: (code: string, message: string, data?: any) =>
		write("debug", code, message, data),
	info: (code: string, message: string, data?: any) =>
		write("info", code, message, data),
	warn: (code: string, message: string, data?: any) =>
		write("warn", code, message, data),
	error: (code: string, message: string, data?: any) =>
		write("error", code, message, data),
};

export function timer() {
	const start = performance.now();
	return () => Math.round(performance.now() - start);
}
