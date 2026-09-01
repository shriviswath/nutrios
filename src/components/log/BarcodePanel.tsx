"use client";

import { useEffect, useRef, useState } from "react";
import { Banner, Button } from "@/components/ui/primitives";
import { isBarcodeScanningSupported, startScanner, type ScannerHandle } from "@/lib/services/barcode";
import { lookupBarcode } from "@/lib/services/openfoodfacts";
import { upsertFood } from "@/lib/db/repo";
import { db } from "@/lib/db/db";
import type { Food } from "@/lib/types";

export function BarcodePanel({ onPicked }: { onPicked: (food: Food) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleRef = useRef<ScannerHandle | null>(null);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => handleRef.current?.stop(), []);

  const resolve = async (barcode: string) => {
    setBusy(true);
    setStatus("Looking up the product…");
    const local = await db.foods.where("barcode").equals(barcode).first();
    if (local) {
      setBusy(false);
      setStatus(null);
      onPicked(local);
      return;
    }
    const result = await lookupBarcode(barcode);
    setBusy(false);
    if (!result.ok || !result.food) {
      setStatus(result.error ?? "Lookup failed.");
      return;
    }
    await upsertFood(result.food);
    setStatus(null);
    onPicked(result.food);
  };

  const start = async () => {
    if (!videoRef.current) return;
    setStatus(null);
    setScanning(true);
    handleRef.current = await startScanner(
      videoRef.current,
      async (value) => {
        handleRef.current?.stop();
        setScanning(false);
        await resolve(value);
      },
      (message) => {
        setStatus(message);
        setScanning(false);
      },
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted">
        Packaged foods are matched against Open Food Facts. This is the only feature that uses the network; everything
        found is copied into your local food list so it works offline afterwards.
      </p>

      <div className={`overflow-hidden rounded-lg border border-line bg-sunken ${scanning ? "" : "hidden"}`}>
        <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
      </div>

      {isBarcodeScanningSupported() ? (
        <Button onClick={scanning ? () => { handleRef.current?.stop(); setScanning(false); } : start} className="w-full">
          {scanning ? "Stop scanning" : "Scan with camera"}
        </Button>
      ) : (
        <Banner>This browser has no barcode detector. Type the number printed under the barcode instead.</Banner>
      )}

      <div className="flex gap-2">
        <input
          className="field num"
          inputMode="numeric"
          placeholder="8901234567890"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-label="Barcode number"
        />
        <Button onClick={() => resolve(code)} disabled={busy || code.length < 6}>
          Find
        </Button>
      </div>

      {status && <Banner tone="warn">{status}</Banner>}
    </div>
  );
}
