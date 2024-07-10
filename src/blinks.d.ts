declare module "@dialectlabs/blinks" {
  export class ActionConfig {
    constructor(endpoint: string, options: any);
  }
}

declare module "@dialectlabs/blinks/ext/twitter" {
  export function setupTwitterObserver(config: any): void;
}
