"use client";

import React, { useState, useEffect } from "react";
import { useCustomizer } from "@/context/CustomizerContext";
import * as Icons from "lucide-react";

interface EditableLabelProps {
  apiKey: string;
  defaultValue: string;
  className?: string;
}

export default function EditableLabel({ apiKey, defaultValue, className = "" }: EditableLabelProps) {
  const { isCustomizerActive, t, updateText } = useCustomizer();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const displayValue = t(apiKey, defaultValue);

  // Sync state with dynamic translation value
  useEffect(() => {
    setInputValue(displayValue);
  }, [displayValue]);

  // Click Interception Handler
  const handleLabelClick = (e: React.MouseEvent) => {
    if (!isCustomizerActive) return;
    
    // Stop all parent interactions (like column sorting or routing)
    e.stopPropagation();
    e.preventDefault();
    
    setIsEditing(true);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (inputValue.trim()) {
      updateText(apiKey, inputValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setInputValue(displayValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()} // Prevent bubble
        className="inline-flex items-center gap-1.5 bg-background border border-red-500/50 p-1 rounded-lg shadow-md animate-in zoom-in-95 duration-100 max-w-full"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="bg-transparent border-0 text-foreground px-1.5 py-0.5 text-xs outline-hidden focus:ring-0 max-w-[120px] sm:max-w-[180px] font-medium"
          autoFocus
        />
        <button
          type="submit"
          className="flex h-5 w-5 items-center justify-center rounded-md bg-red-500 text-white hover:bg-red-600 cursor-pointer"
          title="Guardar"
        >
          <Icons.Check className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted-foreground hover:text-muted cursor-pointer"
          title="Cancelar"
        >
          <Icons.X className="h-3 w-3" />
        </button>
      </form>
    );
  }

  return (
    <span
      onClick={handleLabelClick}
      className={`relative inline-flex items-center gap-1 transition-all ${className} ${
        isCustomizerActive
          ? "cursor-edit border-b border-dashed border-red-500/60 hover:bg-red-500/5 px-1 py-0.5 rounded-sm hover:scale-102 transition-transform duration-150 text-red-600 dark:text-red-500 font-semibold"
          : ""
      }`}
      title={isCustomizerActive ? "Haz clic para editar esta etiqueta del ERP" : undefined}
    >
      <span>{displayValue}</span>
      {isCustomizerActive && (
        <Icons.Edit3 className="h-3 w-3 text-red-500 shrink-0 opacity-70 animate-pulse" />
      )}
    </span>
  );
}