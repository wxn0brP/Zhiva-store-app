export interface Repo {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    owner: { login: string };
    stargazers_count: number;
}

export interface Manifest {
    name?: string;
    icon?: string;
    win_icon?: string;
    description?: string;
    version?: string;
    author?: string;
}