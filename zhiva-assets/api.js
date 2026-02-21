(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("zhiva-secret");

    window.fetchApi = (url, opts = {}, query = {}) => {
        const urlObj = new URL("/zhiva-api/" + url, window.location.origin);

        Object.entries(query).forEach(([key, value]) => {
            urlObj.searchParams.set(key, value);
        });

        return fetch(urlObj, {
            ...opts,
            headers: {
                ...opts.headers,
                "x-zhiva-token": token
            }
        });
    };
})();
