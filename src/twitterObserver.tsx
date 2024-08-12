import { createRoot } from "react-dom/client";
import {
  Action,
  ActionContainer,
  ActionsRegistry,
  type ActionAdapter,
  type ActionCallbacksConfig,
  type StylePreset,
} from "@dialectlabs/blinks";
import { ActionsURLMapper, type ActionsJsonConfig } from "./utils/url-mapper";
import { isInterstitial } from "./utils/interstitial-url";
import { proxify } from "./utils/proxify";
import { EthereumAdapter } from "./adapters";

export type SecurityLevel = "only-trusted" | "non-malicious" | "all";
type ObserverSecurityLevel = SecurityLevel;

export interface ObserverOptions {
  // trusted > unknown > malicious
  securityLevel:
    | ObserverSecurityLevel
    | Record<"websites" | "interstitials" | "actions", ObserverSecurityLevel>;
}

interface NormalizedObserverOptions {
  securityLevel: Record<
    "websites" | "interstitials" | "actions",
    ObserverSecurityLevel
  >;
}

const DEFAULT_OPTIONS: ObserverOptions = {
  securityLevel: "all",
};

const normalizeOptions = (
  options: Partial<ObserverOptions>
): NormalizedObserverOptions => {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    securityLevel: (() => {
      if (!options.securityLevel) {
        return {
          websites: DEFAULT_OPTIONS.securityLevel as ObserverSecurityLevel,
          interstitials: DEFAULT_OPTIONS.securityLevel as ObserverSecurityLevel,
          actions: DEFAULT_OPTIONS.securityLevel as ObserverSecurityLevel,
        };
      }

      if (typeof options.securityLevel === "string") {
        return {
          websites: options.securityLevel,
          interstitials: options.securityLevel,
          actions: options.securityLevel,
        };
      }

      return options.securityLevel;
    })(),
  };
};

export function setupTwitterObserver(
  solanaActionConfig: ActionAdapter,
  starknetActionConfig: ActionAdapter,
  callbacks: Partial<ActionCallbacksConfig> = {},
  options: Partial<ObserverOptions> = DEFAULT_OPTIONS
) {
  const mergedOptions = normalizeOptions(options);
  const twitterReactRoot = document.getElementById("react-root")!;

  const refreshRegistry = async () => {
    await ActionsRegistry.getInstance().init();

    setTimeout(refreshRegistry, 1000 * 60 * 10); // every 10 minutes
  };

  // if we don't have the registry, then we don't show anything
  refreshRegistry().then(() => {
    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        for (let j = 0; j < mutation.addedNodes.length; j++) {
          const node = mutation.addedNodes[j];
          if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
          }
          handleNewNode(
            node as Element,
            solanaActionConfig,
            starknetActionConfig,
            callbacks,
            mergedOptions
          ).catch(() => {});
        }
      }
    });

    observer.observe(twitterReactRoot, { childList: true, subtree: true });
  });
}

async function handleNewNode(
  node: Element,
  solanaActionConfig: ActionAdapter,
  starknetActionConfig: ActionAdapter,
  callbacks: Partial<ActionCallbacksConfig>,
  options: NormalizedObserverOptions
) {
  const element = node as Element;
  // first quick filtration
  if (!element || element.localName !== "div") {
    return;
  }
  const rootElement = findElementByTestId(element, "card.wrapper");
  if (!rootElement) {
    return;
  }
  // handle link preview only, assuming that link preview is a must for actions
  const linkPreview = rootElement.children[0] as HTMLDivElement;
  if (!linkPreview) {
    return;
  }

  const anchor = linkPreview.children[0] as HTMLAnchorElement;
  const shortenedUrl = anchor.href;
  const actionUrl = await resolveTwitterShortenedUrl(shortenedUrl);
  const interstitialData = isInterstitial(actionUrl);

  let actionApiUrl: string | null;
  if (interstitialData.isInterstitial) {
    actionApiUrl = interstitialData.decodedActionUrl;
  } else {
    const actionsJsonUrl = actionUrl.origin + "/actions.json";
    const actionsJson = await fetch(proxify(actionsJsonUrl)).then(
      (res) => res.json() as Promise<ActionsJsonConfig>
    );

    const actionsUrlMapper = new ActionsURLMapper(actionsJson);

    actionApiUrl = actionsUrlMapper.mapUrl(actionUrl);
  }

  let action: Action | null = null;

  if (actionApiUrl) {
    const actionJson = await fetch(proxify(actionApiUrl)).then((res) =>
      res.json()
    );

    if (actionJson.isEthereum) {
      const ethereumActionConfig = new EthereumAdapter(actionJson.chain);
      action = await Action.fetch(actionApiUrl, ethereumActionConfig).catch(
        () => null
      );
    } else if (actionJson.isStarknet) {
      action = await Action.fetch(actionApiUrl, starknetActionConfig).catch(
        () => null
      );
    } else {
      action = await Action.fetch(actionApiUrl, solanaActionConfig).catch(
        () => null
      );
    }
  }

  if (!action) {
    return;
  }

  rootElement.parentElement?.replaceChildren(
    createAction({
      originalUrl: actionUrl,
      action,
      callbacks,
      options,
      isInterstitial: interstitialData.isInterstitial,
    })
  );
}

function createAction({
  originalUrl,
  action,
  callbacks,
  options,
  isInterstitial,
}: {
  originalUrl: URL;
  action: Action;
  callbacks: Partial<ActionCallbacksConfig>;
  options: NormalizedObserverOptions;
  isInterstitial: boolean;
}) {
  const container = document.createElement("div");
  container.className = "dialect-action-root-container";

  const actionRoot = createRoot(container);

  actionRoot.render(
    <ActionContainer
      action={action}
      websiteUrl={originalUrl.toString()}
      websiteText={originalUrl.hostname}
      callbacks={callbacks}
      securityLevel={options.securityLevel}
      stylePreset={resolveXStylePreset()}
    />
  );

  return container;
}

const resolveXStylePreset = (): StylePreset => {
  const colorScheme = document.querySelector("html")?.style.colorScheme;

  if (colorScheme) {
    return colorScheme === "dark" ? "x-dark" : "x-light";
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "x-dark" : "x-light";
};

async function resolveTwitterShortenedUrl(shortenedUrl: string): Promise<URL> {
  const res = await fetch(shortenedUrl);
  const html = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const actionUrl = doc.querySelector("title")?.textContent;
  return new URL(actionUrl!);
}

function findElementByTestId(element: Element, testId: string) {
  if (element.attributes.getNamedItem("data-testid")?.value === testId) {
    return element;
  }
  return element.querySelector(`[data-testid="${testId}"]`);
}
