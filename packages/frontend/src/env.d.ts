declare namespace NodeJS {
  interface ProcessEnv {
    POSTHOG_KEY: string | undefined;
    POSTHOG_HOST: string | undefined;
  }
}
