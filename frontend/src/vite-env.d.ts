interface ImportMetaEnv {
  /** Base URL of the Turnaround API. Defaults to `/api`, proxied to the backend in development. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
