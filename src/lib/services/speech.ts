/**
 * Voice capture via the Web Speech API. Recognition runs in the browser; the transcript is
 * handed to the offline parser in src/lib/nlp. Nothing about your diary leaves the device.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getConstructor(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isVoiceSupported(): boolean {
  return getConstructor() !== undefined;
}

export function listenOnce(
  onTranscript: (text: string) => void,
  onError: (message: string) => void,
  lang = "en-IN",
): () => void {
  const Ctor = getConstructor();
  if (!Ctor) {
    onError("This browser has no speech recognition. Type the meal instead.");
    return () => {};
  }
  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const text = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join(" ");
    onTranscript(text);
  };
  recognition.onerror = (event) => onError(`Speech recognition failed: ${event.error}`);
  recognition.start();
  return () => recognition.stop();
}
