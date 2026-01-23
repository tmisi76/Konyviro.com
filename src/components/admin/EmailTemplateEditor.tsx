import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, X, Send, Eye, Code } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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

import { useSaveEmailTemplate, type EmailTemplate } from "@/hooks/admin/useEmailTemplates";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  name: z.string().min(1, "Név megadása kötelező"),
  slug: z.string().min(1, "Slug megadása kötelező"),
  subject: z.string().min(1, "Tárgy megadása kötelező"),
  body_html: z.string().min(1, "Email tartalom megadása kötelező"),
  body_text: z.string().optional(),
  category: z.string(),
  variables: z.array(z.object({ name: z.string(), description: z.string().optional() })),
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
  const [isSending, setIsSending] = useState(false);
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
      variables: [],
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
        variables: (template.variables || []).map(v => ({ name: v.name || '', description: v.description })),
        is_active: template.is_active ?? true,
      });
    }
  }, [template, form]);

  const variables = form.watch("variables");

  const addVariable = () => {
    const name = prompt("Változó neve:");
    if (name) {
      form.setValue("variables", [...variables, { name, description: "" }]);
    }
  };

  const removeVariable = (index: number) => {
    form.setValue(
      "variables",
      variables.filter((_, i) => i !== index)
    );
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
        variables: data.variables.map(v => ({ name: v.name, description: v.description })),
        is_active: data.is_active,
      });
      toast.success(isNew ? "Sablon létrehozva!" : "Sablon mentve!");
      onSave();
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    }
  }

  async function sendTestEmail() {
    setIsSending(true);
    try {
      const data = form.getValues();
      const { error } = await supabase.functions.invoke("send-admin-email", {
        body: {
          to: "test@example.com", // Replace with actual test email
          subject: data.subject,
          html: data.body_html,
          isTest: true,
        },
      });
      if (error) throw error;
      toast.success("Teszt email elküldve!");
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    } finally {
      setIsSending(false);
    }
  }

  const renderPreview = () => {
    const html = form.watch("body_html") || "";
    const highlighted = html.replace(
      /\{\{(\w+)\}\}/g,
      '<span style="background-color: #fef08a; padding: 0 4px; border-radius: 2px;">$1</span>'
    );
    return DOMPurify.sanitize(highlighted);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Új email sablon" : `${template?.name} szerkesztése`}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
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

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tárgy</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Üdvözlünk a KönyvÍró AI-ban! 📚" />
                  </FormControl>
                </FormItem>
              )}
            />

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

            {!preview ? (
              <FormField
                control={form.control}
                name="body_html"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="font-mono min-h-[300px]"
                        placeholder="<h1>Szia {{user_name}}!</h1>..."
                      />
                    </FormControl>
                    <FormDescription>
                      HTML formátum. Használj {`{{változó_név}}`} szintaxist a
                      dinamikus tartalomhoz.
                    </FormDescription>
                  </FormItem>
                )}
              />
            ) : (
              <div
                className="border rounded-lg p-4 min-h-[300px] bg-white text-black"
                dangerouslySetInnerHTML={{ __html: renderPreview() }}
              />
            )}

            {/* Variables */}
            <div>
              <FormLabel>Változók</FormLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {variables.map((v, i) => (
                  <Badge key={i} variant="secondary" className="gap-2">
                    {`{{${v.name}}}`}
                    <button type="button" onClick={() => removeVariable(i)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariable}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Változó
                </Button>
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
                onClick={sendTestEmail}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
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
  );
}
