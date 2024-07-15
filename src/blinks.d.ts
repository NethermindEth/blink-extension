// declare module "@dialectlabs/blinks" {
//   export class ActionConfig {
//     constructor(endpoint: string, options: any);
//   }
//   export interface ActionAdapter {
//     connect: (context: any) => Promise<string | null>;
//     signTransaction: (
//       tx: string,
//       context: any
//     ) => Promise<
//       | {
//           signature: string;
//         }
//       | {
//           error: string;
//         }
//     >;
//     confirmTransaction: (signature: string, context: any) => Promise<void>;
//   }
// }

declare module "@dialectlabs/blinks/ext/twitter" {
  export type SecurityLevel = "only-trusted" | "non-malicious" | "all";
  export function setupTwitterObserver(
    config: any,
    callbacks?: any,
    options?: ObserverOptions
  ): void;
  export interface ObserverOptions {
    securityLevel: SecurityLevel;
  }
}
