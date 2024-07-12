declare module "@dialectlabs/blinks" {
  export class ActionConfig {
    constructor(endpoint: string, options: any);
  }
}

declare module "@dialectlabs/blinks/ext/twitter" {
  export function setupTwitterObserver(
    config: any,
    callbacks?: any,
    options?: ObserverOptions
  ): void;
  export interface ObserverOptions {
    securityLevel:
      | "all"
      | "only-trusted"
      | "non-malicious"
      | Record<
          "websites" | "interstitials" | "actions",
          "all" | "only-trusted" | "non-malicious"
        >;
  }
}
