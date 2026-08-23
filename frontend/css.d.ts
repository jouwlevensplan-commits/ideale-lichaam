// Ambient type declarations for CSS(-module) imports used by Expo Router's web/static rendering.
// Normally provided by Expo's web tooling at bundle-time; declared here so `tsc --noEmit` (a plain
// TypeScript program, not the Metro bundler) can type-check files that import `.css`/`.module.css`.

declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
