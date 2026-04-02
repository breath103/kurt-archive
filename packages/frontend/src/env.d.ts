declare namespace NodeJS {
  interface ProcessEnv {
    SITE_URL: string;
    POSTHOG_KEY: string | undefined;
    POSTHOG_HOST: string | undefined;
  }
}
