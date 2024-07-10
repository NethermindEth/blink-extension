import { createConfig, http } from "@wagmi/core";
import { mainnet } from "@wagmi/core/chains";

export const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});
