/**
 * Camera barcode scanning via the native BarcodeDetector API.
 *
 * Supported on Chrome/Edge on Android and desktop. Where it is missing (notably iOS Safari)
 * `isBarcodeScanningSupported()` returns false and the UI offers manual entry instead —
 * no polyfill is bundled, because a 300 kB WASM decoder is not worth it for a fallback path.
 */

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> };

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike;
  }
}

export function isBarcodeScanningSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export interface ScannerHandle {
  stop(): void;
}

export async function startScanner(
  video: HTMLVideoElement,
  onResult: (code: string) => void,
  onError: (message: string) => void,
): Promise<ScannerHandle> {
  if (!isBarcodeScanningSupported()) {
    onError("This browser cannot scan barcodes. Type the number from under the barcode instead.");
    return { stop: () => {} };
  }

  let stream: MediaStream | null = null;
  let raf = 0;
  let stopped = false;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    await video.play();
  } catch {
    onError("Camera access was refused. Check the site permissions, or type the barcode number.");
    return { stop: () => {} };
  }

  const detector = new window.BarcodeDetector!({
    formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
  });

  const tick = async () => {
    if (stopped) return;
    try {
      const codes = await detector.detect(video);
      if (codes.length > 0) {
        onResult(codes[0].rawValue);
        return;
      }
    } catch {
      /* transient decode failures are normal between frames */
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}
