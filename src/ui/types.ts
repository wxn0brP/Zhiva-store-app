export interface Repo {
    name: string;
    desc: string | null;
    stars: number;
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