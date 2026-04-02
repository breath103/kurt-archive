declare namespace NodeJS {
  interface ProcessEnv {
    SITE_URL: string;
    REQUIRED_FOO: string;
    OPTIONAL_FOO: string | undefined;
  }
}
