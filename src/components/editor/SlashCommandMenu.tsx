import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BLOCK_TYPE_OPTIONS, type BlockType } from "@/types/editor";

interface SlashCommandMenuProps {
  position: { x: number; y: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ position, onSelect, onClose }: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState("");

  const filteredOptions = BLOCK_TYPE_OPTIONS.filter(
    (opt) =>
      opt.label.toLowerCase().includes(filter.toLowerCase()) ||
      opt.description.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredOptions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredOptions[selectedIndex]) {
          onSelect(filteredOptions[selectedIndex].type);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredOptions, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 rounded-lg border border-border bg-popover p-2 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
        Blokk típusok
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filteredOptions.map((option, index) => (
          <button
            key={option.type}
            onClick={() => onSelect(option.type)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
              index === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded bg-muted text-sm">
              {option.icon}
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </div>
            {option.shortcut && (
              <span className="text-xs text-muted-foreground">{option.shortcut}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
