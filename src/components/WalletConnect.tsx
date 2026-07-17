"use client";

import { useState } from "react";
import { useConnect, useDisconnect, useAccount, useBalance } from "wagmi";
import { Wallet, CheckCircle, X, Loader2, ExternalLink } from "lucide-react";

interface Props {
  userId: string;
  onConnected?: (address: string) => void;
}

export default function WalletConnect({ userId, onConnected }: Props) {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveWallet = async (addr: string) => {
    setSaving(true);
    await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        updates: {
          wallet_address: addr,
          wallet_verified: true,
        },
      }),
    });
    setSaved(true);
    setSaving(false);
    onConnected?.(addr);
  };

  if (isConnected && address) {
    return (
      <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-[#F5F3ED] text-sm font-medium">Wallet connected</span>
          </div>
          <button
            onClick={() => disconnect()}
            className="text-[#5C5A70] hover:text-red-400 transition"
          >
            <X size={14} />
          </button>
        </div>

        <div className="bg-[#0F0F1A] rounded-lg p-3 mb-3">
          <div className="text-[#5C5A70] text-xs mb-1">Address</div>
          <div className="text-[#F5F3ED] text-xs font-mono break-all">
            {address}
          </div>
        </div>

        {balance && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#5C5A70] text-xs">Balance</span>
            <span className="text-[#F5F3ED] text-xs font-medium">
              {(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} {balance.symbol}
            </span>
          </div>
        )}

        {chain && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#5C5A70] text-xs">Network</span>
            <span className="text-[#F5F3ED] text-xs">{chain.name}</span>
          </div>
        )}

       <div className="flex items-center gap-2">
  <a
    href={chain?.blockExplorers?.default.url + `/address/${address}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-1 flex items-center justify-center gap-1.5 border border-[#3A3A52] text-[#A8A6B8] text-xs py-2 rounded-lg hover:border-[#5C5A70] transition"
  >
    <ExternalLink size={12} />
    Explorer
  </a>
  
  {!saved ? (
    <button
      onClick={() => saveWallet(address)}
      disabled={saving}
      className="flex-1 flex items-center justify-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-xs font-medium py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
    >
      {saving ? <Loader2 size={12} className="animate-spin" /> : "Save to profile"}
    </button>
  ) : (
    <div className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-xs py-2 rounded-lg">
      <CheckCircle size={12} />
      Saved
    </div>
  )}
</div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={15} className="text-[#5C5A70]" />
        <span className="text-[#F5F3ED] text-sm font-medium">Connect wallet</span>
      </div>
      <p className="text-[#5C5A70] text-xs mb-4 leading-relaxed">
        Connect your Web3 wallet to verify on-chain holdings and unlock Web3 project features. Read-only — we never request signing or transfer permissions.
      </p>
      <div className="flex flex-col gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="flex items-center gap-3 px-4 py-3 border border-[#3A3A52] rounded-lg hover:border-[#5C5A70] transition text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0F0F1A] flex items-center justify-center shrink-0">
              <Wallet size={16} className="text-[#C9A84C]" />
            </div>
            <div className="flex-1">
              <div className="text-[#F5F3ED] text-sm">{connector.name}</div>
              <div className="text-[#5C5A70] text-xs">
                {connector.name === "WalletConnect" ? "Scan QR code" : "Browser extension"}
              </div>
            </div>
            {isPending && <Loader2 size={14} className="text-[#5C5A70] animate-spin" />}
          </button>
        ))}
      </div>
    </div>
  );
}