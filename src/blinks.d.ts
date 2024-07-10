declare module "@dialectlabs/blinks" {
  export class ActionConfig {
    constructor(endpoint: string, options: any);
  }
}

declare module "@dialectlabs/blinks/ext/twitter" {
  export function setupTwitterObserver(
    config: any,
    options?: ObserverOptions
  ): void;
  export interface ObserverOptions {
    securityLevel?: "all" | "only-trusted" | "non-malicious";
  }
}
