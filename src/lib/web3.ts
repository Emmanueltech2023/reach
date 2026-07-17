import { createConfig, http } from "wagmi";
import { mainnet, polygon, bsc } from "wagmi/chains";
import { walletConnect, injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, bsc],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
  },
});