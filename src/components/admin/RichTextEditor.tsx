import { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { EmailToolbar } from "./EmailToolbar";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, className, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSourceView, setIsSourceView] = useState(false);
  const [sourceValue, setSourceValue] = useState(value);

  // Sync external value changes to editor
  useEffect(() => {
    if (editorRef.current && !isSourceView) {
      const currentHtml = editorRef.current.innerHTML;
      if (currentHtml !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    setSourceValue(value);
  }, [value, isSourceView]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === '<br>' ? '' : html);
    }
  }, [onChange]);

  const handleSourceChange = useCallback((newValue: string) => {
    setSourceValue(newValue);
    onChange(newValue);
  }, [onChange]);

  const toggleSourceView = useCallback(() => {
    if (isSourceView) {
      // Switching from source to WYSIWYG
      if (editorRef.current) {
        editorRef.current.innerHTML = sourceValue;
      }
    } else {
      // Switching from WYSIWYG to source
      if (editorRef.current) {
        setSourceValue(editorRef.current.innerHTML);
      }
    }
    setIsSourceView(!isSourceView);
  }, [isSourceView, sourceValue]);

  // Format text using execCommand
  const handleFormat = useCallback((command: string, value?: string) => {
    if (!editorRef.current || isSourceView) return;
    
    editorRef.current.focus();
    
    if (command === 'formatBlock' && value) {
      document.execCommand(command, false, `<${value}>`);
    } else {
      document.execCommand(command, false, value);
    }
    
    handleInput();
  }, [handleInput, isSourceView]);

  // Handle link insertion
  const handleLink = useCallback(() => {
    if (!editorRef.current || isSourceView) return;
    
    const url = prompt('Add meg a link URL-t:', 'https://');
    if (url) {
      editorRef.current.focus();
      document.execCommand('createLink', false, url);
      handleInput();
    }
  }, [handleInput, isSourceView]);

  // Handle image insertion
  const handleImage = useCallback(() => {
    if (!editorRef.current || isSourceView) return;
    
    const url = prompt('Add meg a kép URL-t:', 'https://');
    if (url) {
      editorRef.current.focus();
      document.execCommand('insertImage', false, url);
      handleInput();
    }
  }, [handleInput, isSourceView]);

  const insertVariable = useCallback((variableName: string) => {
    const variableText = `{{${variableName}}}`;
    
    if (isSourceView) {
      // Insert into textarea at cursor position
      const textarea = document.querySelector('[data-source-editor]') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newValue = text.substring(0, start) + variableText + text.substring(end);
        handleSourceChange(newValue);
        
        // Restore focus and cursor position
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variableText.length, start + variableText.length);
        }, 0);
      }
      return;
    }

    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    // Simply insert as text at cursor position
    document.execCommand('insertText', false, variableText);
    
    handleInput();
  }, [isSourceView, handleInput, handleSourceChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  }, [handleInput]);

  return (
    <div className={cn("border rounded-md overflow-hidden bg-background", className)}>
      <div className="flex items-center justify-between border-b bg-muted/30 p-2">
        <EmailToolbar 
          onFormat={handleFormat}
          onLink={handleLink}
          onImage={handleImage}
        />
        <Button
          type="button"
          variant={isSourceView ? "secondary" : "ghost"}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSourceView();
          }}
          className="h-8 px-2 ml-2 gap-1"
        >
          <Code className="h-4 w-4" />
          HTML
        </Button>
      </div>
      
      {isSourceView ? (
        <Textarea
          data-source-editor
          value={sourceValue}
          onChange={(e) => handleSourceChange(e.target.value)}
          className="min-h-[300px] border-0 rounded-none font-mono text-sm resize-y focus-visible:ring-0"
          placeholder={placeholder}
        />
      ) : (
        <div
          ref={editorRef}
          data-rich-editor
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          className={cn(
            "min-h-[300px] p-4 prose prose-sm max-w-none focus:outline-none",
            "prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2",
            "[&_a]:text-primary [&_a]:underline",
            "[&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4",
            "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground"
          )}
          style={{ 
            direction: 'ltr',
            textAlign: 'left',
            unicodeBidi: 'plaintext'
          }}
          data-placeholder={placeholder || "Kezdj el írni..."}
          dangerouslySetInnerHTML={{ __html: value || '' }}
        />
      )}
      
      {/* Expose insertVariable method */}
      <input 
        type="hidden" 
        data-insert-variable 
        onClick={(e) => {
          const variableName = (e.target as HTMLInputElement).dataset.variable;
          if (variableName) insertVariable(variableName);
        }}
      />
    </div>
  );
}

// Export a hook to get the insert function
export function useRichTextEditor() {
  const insertVariable = useCallback((variableName: string) => {
    const hiddenInput = document.querySelector('[data-insert-variable]') as HTMLInputElement;
    if (hiddenInput) {
      hiddenInput.dataset.variable = variableName;
      hiddenInput.click();
    }
  }, []);

  return { insertVariable };
}
