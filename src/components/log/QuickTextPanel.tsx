"use client";

import { useState } from "react";
import { Banner, Button } from "@/components/ui/primitives";
import { useFoods } from "@/lib/hooks";
import { parseMealText, type ParsedItem } from "@/lib/nlp/parseMealText";
import { addFoodLog } from "@/lib/db/repo";
import { scaleMacros } from "@/lib/nutrition/scaling";
import { isVoiceSupported, listenOnce } from "@/lib/services/speech";
import type { MealSlot } from "@/lib/types";
import { kcal } from "@/lib/utils/format";

export function QuickTextPanel({ date, meal, onDone }: { date: string; meal: MealSlot; onDone: () => void }) {
  const foods = useFoods();
  const [text, setText] = useState("");
  const [items, setItems] = useState<ParsedItem[] | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parse = () => {
    setError(null);
    setItems(parseMealText(text, foods));
  };

  const commit = async () => {
    if (!items) return;
    for (const item of items) {
      if (!item.food || !item.amountBase) continue;
      await addFoodLog({ date, meal, food: item.food, quantity: item.amountBase });
    }
    onDone();
  };

  const usable = items?.filter((i) => i.food && i.amountBase) ?? [];

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted">
        Describe the meal in plain words. Matching happens on this device against your own food list — check every line
        before it goes into the diary.
      </p>
      <textarea
        className="field min-h-[84px]"
        placeholder="2 idli, sambar, 3 eggs and one cup of tea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Describe your meal"
      />
      <div className="flex gap-2">
        <Button onClick={parse} disabled={!text.trim()}>
          Read this
        </Button>
        {isVoiceSupported() && (
          <Button
            variant={listening ? "solid" : "outline"}
            onClick={() => {
              setListening(true);
              setError(null);
              listenOnce(
                (transcript) => {
                  setText((t) => (t ? `${t}, ${transcript}` : transcript));
                  setListening(false);
                },
                (message) => {
                  setError(message);
                  setListening(false);
                },
              );
            }}
          >
            {listening ? "Listening…" : "Speak"}
          </Button>
        )}
      </div>

      {error && <Banner tone="warn">{error}</Banner>}

      {items && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <ParsedRow key={i} item={item} />
          ))}
          <Button variant="solid" className="w-full" onClick={commit} disabled={usable.length === 0}>
            Add {usable.length} {usable.length === 1 ? "item" : "items"} to {meal}
          </Button>
          {usable.length < items.length && (
            <p className="text-[12px] text-muted">Lines without a match are skipped. Add them as foods first.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ParsedRow({ item }: { item: ParsedItem }) {
  const macros = item.food && item.amountBase ? scaleMacros(item.food.per100, item.amountBase) : null;
  const tone = item.confidence === "high" ? "text-ok" : item.confidence === "medium" ? "text-energy" : "text-warn";
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium">
          {item.food ? item.food.name : item.raw}{" "}
          <span className="text-[12px] font-normal text-muted">
            {item.amountBase ? `· ${item.amountBase} ${item.food?.unit ?? "g"}` : ""}
          </span>
        </p>
        {macros && <span className="num text-[13px]">{kcal(macros.kcal)} kcal</span>}
      </div>
      <p className={`text-[12px] ${tone}`}>
        {item.issue ?? (item.confidence === "high" ? "Confident match" : "Check this one")}
      </p>
    </div>
  );
}
