export interface Repo {
    full_name: string;
    description: string | null;
    stargazers_count: number;
    verified: boolean;
}

export interface Manifest {
    name?: string;
    icon?: string;
    win_icon?: string;
    description?: string;
    version?: string;
    author?: string;
}