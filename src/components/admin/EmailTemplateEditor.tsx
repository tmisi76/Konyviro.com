import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Send, Eye, Code, ChevronDown, ChevronUp } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { EmailToolbar } from "./EmailToolbar";
import { TestEmailModal } from "./TestEmailModal";
import { replaceVariablesWithTestData } from "@/constants/emailVariables";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = form.getValues("body_html");
    const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
    
    form.setValue("body_html", newValue);
    
    // Focus and set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const insertTagAtCursor = (openTag: string, closeTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = form.getValues("body_html");
    const selectedText = currentValue.slice(start, end);
    const newValue = 
      currentValue.slice(0, start) + 
      openTag + selectedText + closeTag + 
      currentValue.slice(end);
    
    form.setValue("body_html", newValue);
    
    // Position cursor between tags if no selection, or after if there was selection
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        const newPosition = start + openTag.length + selectedText.length + closeTag.length;
        textarea.setSelectionRange(newPosition, newPosition);
      } else {
        const newPosition = start + openTag.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

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
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={!preview ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreview(false)}
                      >
                        <Code className="h-4 w-4 mr-1" />
                        Szerkesztés
                      </Button>
                      <Button
                        type="button"
                        variant={preview ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreview(true)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Előnézet
                      </Button>
                    </div>
                  </div>

                  {!preview && (
                    <EmailToolbar 
                      onInsertTag={insertTagAtCursor}
                      onInsertSingleTag={insertAtCursor}
                    />
                  )}

                  {!preview ? (
                    <FormField
                      control={form.control}
                      name="body_html"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              {...field}
                              ref={textareaRef}
                              className="font-mono min-h-[350px] text-sm"
                              placeholder="<h1>Szia {{user_name}}!</h1>..."
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
                        onInsert={insertAtCursor}
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
