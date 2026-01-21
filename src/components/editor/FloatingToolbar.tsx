import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, Link, Highlighter } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  position: { x: number; y: number };
  onClose: () => void;
}

export function FloatingToolbar({ position, onClose }: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const buttons = [
    { icon: Bold, command: "bold", label: "Félkövér" },
    { icon: Italic, command: "italic", label: "Dőlt" },
    { icon: Underline, command: "underline", label: "Aláhúzott" },
    { icon: Highlighter, command: "backColor", value: "#fef08a", label: "Kiemelés" },
    { icon: Link, command: "createLink", label: "Link" },
  ];

  const handleClick = (command: string, value?: string) => {
    if (command === "createLink") {
      const url = prompt("Add meg a link URL-jét:");
      if (url) execCommand(command, url);
    } else {
      execCommand(command, value);
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      {buttons.map(({ icon: Icon, command, value, label }) => (
        <button
          key={command}
          onClick={() => handleClick(command, value)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          )}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
