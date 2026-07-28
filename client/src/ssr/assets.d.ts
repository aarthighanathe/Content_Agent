// WHY: renderSlideHtml.tsx imports .woff2 files, which esbuild converts to
// `data:font/woff2;base64,...` strings via --loader:.woff2=dataurl. Without this
// declaration TypeScript has no type for those imports and the client build fails.
declare module '*.woff2' {
  const dataUrl: string;
  export default dataUrl;
}
