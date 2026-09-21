"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  className?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export default function SmartSearchInput({ value, onChange, suggestions, placeholder, className = "", emptyActionLabel, onEmptyAction }: SmartSearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = value.trim().toLocaleLowerCase("es");
    if (!normalizedQuery) return [];

    const uniqueSuggestions = Array.from(new Set(suggestions.filter(Boolean)));
    return uniqueSuggestions
      .filter((suggestion) => suggestion.toLocaleLowerCase("es").startsWith(normalizedQuery))
      .concat(uniqueSuggestions.filter((suggestion) => {
        const normalizedSuggestion = suggestion.toLocaleLowerCase("es");
        return !normalizedSuggestion.startsWith(normalizedQuery) && normalizedSuggestion.includes(normalizedQuery);
      }))
      .slice(0, 7);
  }, [suggestions, value]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [value]);

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setIsFocused(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!filteredSuggestions.length) {
      if (event.key === "Escape") setIsFocused(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((index) => (index + 1) % filteredSuggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => (index - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectSuggestion(filteredSuggestions[highlightedIndex]);
    } else if (event.key === "Escape") {
      setIsFocused(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Icons.Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isFocused && (filteredSuggestions.length > 0 || Boolean(emptyActionLabel && onEmptyAction))}
        className="w-full rounded-lg border border-border/50 bg-background py-1.5 pr-3 pl-9 text-xs text-foreground placeholder-muted-foreground outline-hidden focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50"
      />
      {isFocused && (filteredSuggestions.length > 0 || Boolean(emptyActionLabel && onEmptyAction)) && <div className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl" role="listbox">
        {filteredSuggestions.map((suggestion, index) => <button key={suggestion} type="button" role="option" aria-selected={highlightedIndex === index} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSuggestion(suggestion)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${highlightedIndex === index ? "bg-red-500/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icons.Search className="h-3.5 w-3.5 shrink-0 text-red-500" /><span className="truncate">{suggestion}</span></button>)}
        {emptyActionLabel && onEmptyAction && <button type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => { setIsFocused(false); onEmptyAction(); }} className="flex w-full items-center gap-2 border-t border-border/50 px-3 py-2.5 text-left text-xs font-bold text-red-700 transition hover:bg-red-500/10"><Icons.Plus className="h-4 w-4" /><span>{emptyActionLabel}</span></button>}
      </div>}
    </div>
  );
}
