import { ZhivaApiOptions, ZhivaApiQuery } from "@wxn0brp/zhiva-base-lib/types/api";

export async function mockFetchApi(endpoint: string, options: ZhivaApiOptions = {}, query: ZhivaApiQuery = {}): Promise<Response> {
    console.log(`[BROWSER MODE] Mocked API call for: ${endpoint}`, { options, query });
    const appName = query?.app;

    switch (endpoint) {
        case "installed":
            return new Response(JSON.stringify({ apps: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        case "get-updates":
            return new Response(JSON.stringify({ err: false, updates: {} }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        case "install":
            window.location.href = `zhiva://install/${appName}`;
            return new Response(JSON.stringify({ err: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        case "start":
            window.location.href = `zhiva://start/${appName}`;
            return new Response(JSON.stringify({ err: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        case "uninstall":
        case "update":
            console.warn(`Action "${endpoint}" is not available in browser-only mode. Doing nothing.`);
            return new Response(JSON.stringify({ err: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        default:
            return new Response(JSON.stringify({ err: true, msg: "Endpoint not mocked for browser mode" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
    }
}
