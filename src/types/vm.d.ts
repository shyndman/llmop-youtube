import '@violentmonkey/types';

declare global {
  /**
   * Violentmonkey's fetch function that bypasses CORS restrictions
   */
  function GM_fetch(url: string, init?: RequestInit): Promise<Response>;

  /**
   * Violentmonkey's fetch function (GM. style) that bypasses CORS restrictions
   */
  namespace GM {
    function fetch(url: string, init?: RequestInit): Promise<Response>;
  }
}
