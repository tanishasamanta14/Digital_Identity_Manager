"use client";

import { useState, useCallback } from "react";
import {
  registerIdentity,
  getIdentity,
  updateDisplayName,
  deactivateIdentity,
  addClaim,
  getClaim,
  revokeClaim,
  registerVerifier,
  isVerifier,
  verifyClaim,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function IdentityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Status Config ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; variant: "success" | "warning" | "info" }> = {
  Active: { color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", dot: "bg-[#34d399]", variant: "success" },
  Deactivated: { color: "text-[#f87171]", bg: "bg-[#f87171]/10", border: "border-[#f87171]/20", dot: "bg-[#f87171]", variant: "warning" },
  Verified: { color: "text-[#4fc3f7]", bg: "bg-[#4fc3f7]/10", border: "border-[#4fc3f7]/20", dot: "bg-[#4fc3f7]", variant: "info" },
  Revoked: { color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/20", dot: "bg-[#fbbf24]", variant: "warning" },
};

// ── Main Component ───────────────────────────────────────────

type Tab = "identity" | "claims" | "verifier" | "verify";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("identity");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Identity state
  const [did, setDid] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [searchOwner, setSearchOwner] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [identityData, setIdentityData] = useState<Record<string, unknown> | null>(null);

  // Claims state
  const [claimSubject, setClaimSubject] = useState("");
  const [claimKey, setClaimKey] = useState("");
  const [claimValue, setClaimValue] = useState("");
  const [claimExpiry, setClaimExpiry] = useState("");
  const [isAddingClaim, setIsAddingClaim] = useState(false);
  const [isRevokingClaim, setIsRevokingClaim] = useState(false);
  const [claimData, setClaimData] = useState<Record<string, unknown> | null>(null);

  // Verifier state
  const [verifierName, setVerifierName] = useState("");
  const [isRegisteringVerifier, setIsRegisteringVerifier] = useState(false);
  const [isCheckingVerifier, setIsCheckingVerifier] = useState(false);
  const [verifierResult, setVerifierResult] = useState<boolean | null>(null);

  // Verify claim state
  const [verifySubject, setVerifySubject] = useState("");
  const [verifyClaimKey, setVerifyClaimKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleRegisterIdentity = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!did.trim() || !displayName.trim()) return setError("Fill in all fields");
    setError(null);
    setIsRegistering(true);
    setTxStatus("Awaiting signature...");
    try {
      const owner = walletAddress;
      const fullDid = `did:stellar:${owner}`;
      await registerIdentity(owner, fullDid, displayName.trim());
      setTxStatus("Identity registered on-chain!");
      setDid("");
      setDisplayName("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsRegistering(false);
    }
  }, [walletAddress, did, displayName]);

  const handleUpdateDisplayName = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!newDisplayName.trim()) return setError("Enter a new display name");
    setError(null);
    setIsUpdating(true);
    setTxStatus("Awaiting signature...");
    try {
      await updateDisplayName(walletAddress, newDisplayName.trim());
      setTxStatus("Display name updated!");
      setNewDisplayName("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsUpdating(false);
    }
  }, [walletAddress, newDisplayName]);

  const handleDeactivateIdentity = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!confirm("Are you sure you want to deactivate your identity? This cannot be undone.")) return;
    setError(null);
    setIsDeactivating(true);
    setTxStatus("Awaiting signature...");
    try {
      await deactivateIdentity(walletAddress);
      setTxStatus("Identity deactivated!");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsDeactivating(false);
    }
  }, [walletAddress]);

  const handleGetIdentity = useCallback(async () => {
    if (!searchOwner.trim()) return setError("Enter an owner address");
    setError(null);
    setIsSearching(true);
    setIdentityData(null);
    try {
      const result = await getIdentity(searchOwner.trim(), walletAddress || undefined);
      if (result && typeof result === "object") {
        setIdentityData(result as Record<string, unknown>);
      } else {
        setError("Identity not found");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsSearching(false);
    }
  }, [searchOwner, walletAddress]);

  const handleAddClaim = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!claimSubject.trim() || !claimKey.trim() || !claimValue.trim()) return setError("Fill in all fields");
    setError(null);
    setIsAddingClaim(true);
    setTxStatus("Awaiting signature...");
    try {
      await addClaim(
        walletAddress,
        claimSubject.trim(),
        claimKey.trim(),
        claimValue.trim(),
        claimExpiry ? BigInt(claimExpiry) : BigInt(0)
      );
      setTxStatus("Claim added!");
      setClaimSubject("");
      setClaimKey("");
      setClaimValue("");
      setClaimExpiry("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsAddingClaim(false);
    }
  }, [walletAddress, claimSubject, claimKey, claimValue, claimExpiry]);

  const handleGetClaim = useCallback(async () => {
    if (!claimSubject.trim() || !claimKey.trim()) return setError("Enter subject address and claim key");
    setError(null);
    setIsSearching(true);
    setClaimData(null);
    try {
      const result = await getClaim(claimSubject.trim(), claimKey.trim(), walletAddress || undefined);
      if (result && typeof result === "object") {
        setClaimData(result as Record<string, unknown>);
      } else {
        setError("Claim not found");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsSearching(false);
    }
  }, [claimSubject, claimKey, walletAddress]);

  const handleRevokeClaim = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!claimSubject.trim() || !claimKey.trim()) return setError("Enter subject address and claim key");
    setError(null);
    setIsRevokingClaim(true);
    setTxStatus("Awaiting signature...");
    try {
      await revokeClaim(walletAddress, claimSubject.trim(), claimKey.trim());
      setTxStatus("Claim revoked!");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsRevokingClaim(false);
    }
  }, [walletAddress, claimSubject, claimKey]);

  const handleRegisterVerifier = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!verifierName.trim()) return setError("Enter a verifier name");
    setError(null);
    setIsRegisteringVerifier(true);
    setTxStatus("Awaiting signature...");
    try {
      await registerVerifier(walletAddress, verifierName.trim());
      setTxStatus("Registered as verifier!");
      setVerifierName("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsRegisteringVerifier(false);
    }
  }, [walletAddress, verifierName]);

  const handleCheckVerifier = useCallback(async () => {
    if (!searchOwner.trim()) return setError("Enter a verifier address");
    setError(null);
    setIsCheckingVerifier(true);
    setVerifierResult(null);
    try {
      const result = await isVerifier(searchOwner.trim(), walletAddress || undefined);
      setVerifierResult(result as boolean);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsCheckingVerifier(false);
    }
  }, [searchOwner, walletAddress]);

  const handleVerifyClaim = useCallback(async () => {
    if (!verifySubject.trim() || !verifyClaimKey.trim()) return setError("Enter subject address and claim key");
    setError(null);
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const result = await verifyClaim(verifySubject.trim(), verifyClaimKey.trim(), walletAddress || undefined);
      setVerifyResult(result as boolean);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsVerifying(false);
    }
  }, [verifySubject, verifyClaimKey, walletAddress]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "identity", label: "Identity", icon: <IdentityIcon />, color: "#7c6cf0" },
    { key: "claims", label: "Claims", icon: <KeyIcon />, color: "#4fc3f7" },
    { key: "verifier", label: "Verifier", icon: <ShieldIcon />, color: "#34d399" },
    { key: "verify", label: "Verify", icon: <CheckIcon />, color: "#fbbf24" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("updated") || txStatus.includes("added") || txStatus.includes("registered") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c6cf0]">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Digital Identity Manager</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setTxStatus(null); setIdentityData(null); setClaimData(null); setVerifierResult(null); setVerifyResult(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Identity Tab */}
            {activeTab === "identity" && (
              <div className="space-y-5">
                <MethodSignature name="register_identity" params="(owner: Address, did: String, display_name: String)" returns="-> Identity" color="#7c6cf0" />
                
                <Input label="DID (auto-generated)" value={walletAddress ? `did:stellar:${walletAddress}` : "Connect wallet to generate"} disabled placeholder="will be auto-generated" />
                <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Alice" />
                
                {walletAddress ? (
                  <ShimmerButton onClick={handleRegisterIdentity} disabled={isRegistering} shimmerColor="#7c6cf0" className="w-full">
                    {isRegistering ? <><SpinnerIcon /> Registering...</> : <><IdentityIcon /> Register Identity</>}
                  </ShimmerButton>
                ) : (
                  <button onClick={onConnect} disabled={isConnecting} className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50">
                    Connect wallet to register identity
                  </button>
                )}

                {/* Get Identity */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <MethodSignature name="get_identity" params="(owner: Address)" returns="-> Identity" color="#4fc3f7" />
                  <div className="mt-4 space-y-3">
                    <Input label="Owner Address" value={searchOwner} onChange={(e) => setSearchOwner(e.target.value)} placeholder="G..." />
                    <div className="flex gap-2">
                      <ShimmerButton onClick={handleGetIdentity} disabled={isSearching} shimmerColor="#4fc3f7" className="flex-1">
                        {isSearching ? <><SpinnerIcon /> Searching...</> : <><SearchIcon /> Get Identity</>}
                      </ShimmerButton>
                    </div>
                  </div>
                </div>

                {identityData && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Identity Details</span>
                      {(() => {
                        const isActive = identityData.is_active === true;
                        const cfg = STATUS_CONFIG[isActive ? "Active" : "Deactivated"];
                        return (
                          <Badge variant={cfg.variant}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                            {isActive ? "Active" : "Deactivated"}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="p-4 space-y-3">
                      {Object.entries(identityData).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-white/35 capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="font-mono text-sm text-white/80">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Update & Deactivate */}
                {walletAddress && (
                  <div className="pt-4 border-t border-white/[0.06] space-y-4">
                    <MethodSignature name="update_display_name" params="(owner: Address, new_name: String)" color="#fbbf24" />
                    <Input label="New Display Name" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="Enter new name" />
                    <ShimmerButton onClick={handleUpdateDisplayName} disabled={isUpdating} shimmerColor="#fbbf24" className="w-full">
                      {isUpdating ? <><SpinnerIcon /> Updating...</> : <><RefreshIcon /> Update Display Name</>}
                    </ShimmerButton>

                    <div className="pt-4">
                      <MethodSignature name="deactivate_identity" params="(owner: Address)" color="#f87171" />
                      <button
                        onClick={handleDeactivateIdentity}
                        disabled={isDeactivating}
                        className="mt-3 w-full rounded-xl border border-[#f87171]/20 bg-[#f87171]/[0.03] py-3 text-sm text-[#f87171]/60 hover:border-[#f87171]/30 hover:text-[#f87171]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                      >
                        {isDeactivating ? <><SpinnerIcon /> Deactivating...</> : "Deactivate Identity"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Claims Tab */}
            {activeTab === "claims" && (
              <div className="space-y-5">
                <MethodSignature name="add_claim" params="(subject, issuer, key, value, expiry)" returns="-> Claim" color="#4fc3f7" />
                
                <Input label="Subject Address" value={claimSubject} onChange={(e) => setClaimSubject(e.target.value)} placeholder="G... (identity owner)" />
                <Input label="Claim Key" value={claimKey} onChange={(e) => setClaimKey(e.target.value)} placeholder="e.g. email, kyc_level, country" />
                <Input label="Claim Value" value={claimValue} onChange={(e) => setClaimValue(e.target.value)} placeholder="e.g. john@email.com, 2, US" />
                <Input label="Expires At (timestamp, 0=never)" value={claimExpiry} onChange={(e) => setClaimExpiry(e.target.value)} placeholder="e.g. 1735689600" />

                {walletAddress ? (
                  <ShimmerButton onClick={handleAddClaim} disabled={isAddingClaim} shimmerColor="#4fc3f7" className="w-full">
                    {isAddingClaim ? <><SpinnerIcon /> Adding...</> : <><PlusIcon /> Add Claim</>}
                  </ShimmerButton>
                ) : (
                  <button onClick={onConnect} disabled={isConnecting} className="w-full rounded-xl border border-dashed border-[#4fc3f7]/20 bg-[#4fc3f7]/[0.03] py-4 text-sm text-[#4fc3f7]/60 hover:border-[#4fc3f7]/30 hover:text-[#4fc3f7]/80 active:scale-[0.99] transition-all disabled:opacity-50">
                    Connect wallet to add claims
                  </button>
                )}

                {/* Get/Rvoke Claim */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <MethodSignature name="get_claim" params="(subject: Address, key: String)" returns="-> Claim" color="#7c6cf0" />
                  <div className="mt-4 space-y-3">
                    <Input label="Subject Address" value={claimSubject} onChange={(e) => setClaimSubject(e.target.value)} placeholder="G..." />
                    <Input label="Claim Key" value={claimKey} onChange={(e) => setClaimKey(e.target.value)} placeholder="e.g. email" />
                    <div className="flex gap-2">
                      <ShimmerButton onClick={handleGetClaim} disabled={isSearching} shimmerColor="#7c6cf0" className="flex-1">
                        {isSearching ? <><SpinnerIcon /> Searching...</> : <><SearchIcon /> Get Claim</>}
                      </ShimmerButton>
                      {walletAddress && (
                        <ShimmerButton onClick={handleRevokeClaim} disabled={isRevokingClaim} shimmerColor="#f87171" className="flex-1">
                          {isRevokingClaim ? <><SpinnerIcon /> Revoking...</> : "Revoke"}
                        </ShimmerButton>
                      )}
                    </div>
                  </div>
                </div>

                {claimData && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Claim Details</span>
                      {(() => {
                        const isRevoked = claimData.is_revoked === true;
                        const cfg = STATUS_CONFIG[isRevoked ? "Revoked" : "Verified"];
                        return (
                          <Badge variant={cfg.variant}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                            {isRevoked ? "Revoked" : "Valid"}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="p-4 space-y-3">
                      {Object.entries(claimData).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-white/35 capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="font-mono text-sm text-white/80">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verifier Tab */}
            {activeTab === "verifier" && (
              <div className="space-y-5">
                <MethodSignature name="register_verifier" params="(verifier: Address, name: String)" color="#34d399" />
                
                <Input label="Verifier Name" value={verifierName} onChange={(e) => setVerifierName(e.target.value)} placeholder="e.g. KnowYourCustomer Co." />

                {walletAddress ? (
                  <ShimmerButton onClick={handleRegisterVerifier} disabled={isRegisteringVerifier} shimmerColor="#34d399" className="w-full">
                    {isRegisteringVerifier ? <><SpinnerIcon /> Registering...</> : <><ShieldIcon /> Register as Verifier</>}
                  </ShimmerButton>
                ) : (
                  <button onClick={onConnect} disabled={isConnecting} className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50">
                    Connect wallet to register as verifier
                  </button>
                )}

                {/* Check Verifier */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <MethodSignature name="is_verifier" params="(verifier: Address)" returns="-> bool" color="#7c6cf0" />
                  <div className="mt-4 space-y-3">
                    <Input label="Verifier Address" value={searchOwner} onChange={(e) => setSearchOwner(e.target.value)} placeholder="G..." />
                    <ShimmerButton onClick={handleCheckVerifier} disabled={isCheckingVerifier} shimmerColor="#7c6cf0" className="w-full">
                      {isCheckingVerifier ? <><SpinnerIcon /> Checking...</> : <><SearchIcon /> Check Verifier Status</>}
                    </ShimmerButton>
                  </div>
                </div>

                {verifierResult !== null && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Verifier Status</span>
                      <Badge variant={verifierResult ? "success" : "warning"}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", verifierResult ? "bg-[#34d399]" : "bg-[#fbbf24]")} />
                        {verifierResult ? "Registered" : "Not Registered"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verify Tab */}
            {activeTab === "verify" && (
              <div className="space-y-5">
                <MethodSignature name="verify_claim" params="(subject: Address, key: String)" returns="-> bool" color="#fbbf24" />
                
                <Input label="Subject Address" value={verifySubject} onChange={(e) => setVerifySubject(e.target.value)} placeholder="G... (identity owner)" />
                <Input label="Claim Key" value={verifyClaimKey} onChange={(e) => setVerifyClaimKey(e.target.value)} placeholder="e.g. kyc_level" />

                <ShimmerButton onClick={handleVerifyClaim} disabled={isVerifying} shimmerColor="#fbbf24" className="w-full">
                  {isVerifying ? <><SpinnerIcon /> Verifying...</> : <><CheckIcon /> Verify Claim</>}
                </ShimmerButton>

                {verifyResult !== null && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Verification Result</span>
                      <Badge variant={verifyResult ? "success" : "warning"}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", verifyResult ? "bg-[#34d399]" : "bg-[#f87171]")} />
                        {verifyResult ? "Valid & Active" : "Invalid / Expired / Revoked"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Digital Identity Manager &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {["Identity", "Claims", "Verifier"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="font-mono text-[9px] text-white/15">{s}</span>
                  {i < 2 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
