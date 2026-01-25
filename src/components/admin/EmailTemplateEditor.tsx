import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Send, Eye, ChevronDown, ChevronUp } from "lucide-react";
import DOMPurify from "dompurify";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { useSaveEmailTemplate, type EmailTemplate } from "@/hooks/admin/useEmailTemplates";
import { VariableInserter } from "./VariableInserter";
import { TestEmailModal } from "./TestEmailModal";
import { replaceVariablesWithTestData } from "@/constants/emailVariables";
import { RichTextEditor } from "./RichTextEditor";

const formSchema = z.object({
  name: z.string().min(1, "Név megadása kötelező"),
  slug: z.string().min(1, "Slug megadása kötelező"),
  subject: z.string().min(1, "Tárgy megadása kötelező"),
  body_html: z.string().min(1, "Email tartalom megadása kötelező"),
  body_text: z.string().optional(),
  category: z.string(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface EmailTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Partial<EmailTemplate> | null;
  onSave: () => void;
}

export function EmailTemplateEditor({
  open,
  onOpenChange,
  template,
  onSave,
}: EmailTemplateEditorProps) {
  const [preview, setPreview] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(true);
  const editorRef = useRef<{ insertVariable: (name: string) => void } | null>(null);
  const saveTemplate = useSaveEmailTemplate();
  const isNew = !template?.id;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      subject: "",
      body_html: "",
      body_text: "",
      category: "transactional",
      is_active: true,
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name || "",
        slug: template.slug || "",
        subject: template.subject || "",
        body_html: template.body_html || "",
        body_text: template.body_text || "",
        category: template.category || "transactional",
        is_active: template.is_active ?? true,
      });
    }
  }, [template, form]);

  const handleInsertVariable = useCallback((variableName: string) => {
    // Get the rich text editor element and insert variable
    const editorDiv = document.querySelector('[data-rich-editor]') as HTMLDivElement;
    const sourceEditor = document.querySelector('[data-source-editor]') as HTMLTextAreaElement;
    
    if (sourceEditor) {
      // Source view mode - insert into textarea
      const start = sourceEditor.selectionStart;
      const end = sourceEditor.selectionEnd;
      const text = sourceEditor.value;
      const variableText = `{{${variableName}}}`;
      const newValue = text.substring(0, start) + variableText + text.substring(end);
      form.setValue("body_html", newValue);
      
      setTimeout(() => {
        sourceEditor.focus();
        sourceEditor.setSelectionRange(start + variableText.length, start + variableText.length);
      }, 0);
    } else if (editorDiv) {
      // WYSIWYG mode - insert styled span
      editorDiv.focus();
      
      const selection = window.getSelection();
      if (!selection) return;
      
      // Create a styled span for the variable
      const variableSpan = document.createElement('span');
      variableSpan.className = 'inline-block bg-primary/10 text-primary px-1.5 py-0.5 rounded text-sm font-mono mx-0.5';
      variableSpan.contentEditable = 'false';
      variableSpan.textContent = `{{${variableName}}}`;
      
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(variableSpan);
        
        // Add a space after and move cursor there
        const space = document.createTextNode('\u00A0');
        range.setStartAfter(variableSpan);
        range.insertNode(space);
        range.setStartAfter(space);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Trigger onChange
      const event = new Event('input', { bubbles: true });
      editorDiv.dispatchEvent(event);
    }
  }, [form]);

  async function onSubmit(data: FormData) {
    try {
      await saveTemplate.mutateAsync({
        id: template?.id,
        name: data.name,
        slug: data.slug,
        subject: data.subject,
        body_html: data.body_html,
        body_text: data.body_text,
        category: data.category,
        variables: [],
        is_active: data.is_active,
      });
      toast.success(isNew ? "Sablon létrehozva!" : "Sablon mentve!");
      onSave();
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    }
  }

  const renderPreview = () => {
    const html = form.watch("body_html") || "";
    // Replace variables with test values for preview
    const withTestData = replaceVariablesWithTestData(html);
    return DOMPurify.sanitize(withTestData);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNew ? "Új email sablon" : `${template?.name} szerkesztése`}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sablon neve</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Üdvözlő email" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug (azonosító)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="welcome" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Kategória</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="transactional">Tranzakciós</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="notification">Értesítés</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 pt-8">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Aktív</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Subject */}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tárgy</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Üdvözlünk a KönyvÍró AI-ban! 📚" />
                    </FormControl>
                    <FormDescription>
                      Változók használhatók: {`{{user_name}}`}, {`{{project_title}}`}, stb.
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Content Editor */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel>Email tartalom</FormLabel>
                    <Button
                      type="button"
                      variant={preview ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreview(!preview)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {preview ? "Szerkesztés" : "Előnézet"}
                    </Button>
                  </div>

                  {!preview ? (
                    <FormField
                      control={form.control}
                      name="body_html"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RichTextEditor
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Kezdj el írni vagy szúrj be változókat..."
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div
                      className="border rounded-lg p-4 min-h-[350px] bg-white text-black overflow-auto"
                      dangerouslySetInnerHTML={{ __html: renderPreview() }}
                    />
                  )}
                </div>

                {/* Variable Inserter Panel */}
                <div className="space-y-2">
                  <Collapsible open={variablesOpen} onOpenChange={setVariablesOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-2">
                        <span className="font-medium">Változók beszúrása</span>
                        {variablesOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <VariableInserter 
                        onInsert={handleInsertVariable}
                        className="mt-2"
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-2">
                    <p><strong>Tipp:</strong> Kattints egy változóra a beszúráshoz a kurzor pozíciójára.</p>
                    <p>Az előnézetben a változók mintaértékekkel jelennek meg.</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Mégse
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTestModalOpen(true)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Teszt küldés
                </Button>
                <Button type="submit" disabled={saveTemplate.isPending}>
                  {saveTemplate.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Mentés
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <TestEmailModal
        open={testModalOpen}
        onOpenChange={setTestModalOpen}
        subject={form.watch("subject")}
        bodyHtml={form.watch("body_html")}
      />
    </>
  );
}
