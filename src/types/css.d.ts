// Empty CSS module definitions to support imports
// These will be removed in the future when CSS is properly implemented
declare module '*.module.css' {
  export const stylesheet: string;
  const classMap: Record<string, string>;
  export default classMap;
}

declare module '*.css' {
  const css: string;
  export default css;
}
