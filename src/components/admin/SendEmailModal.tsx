import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  template: z.string().optional(),
  subject: z.string().min(1, "Add meg a tárgyat"),
  body: z.string().min(1, "Add meg az üzenetet"),
});

type FormData = z.infer<typeof formSchema>;

interface SendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

const EMAIL_TEMPLATES = [
  { id: 'custom', name: 'Egyedi üzenet', subject: '', body: '' },
  { 
    id: 'reminder', 
    name: 'Emlékeztető', 
    subject: 'Ne hagyd abba az írást!',
    body: 'Szia {{name}}!\n\nÉszrevettük, hogy egy ideje nem írtál. Ne hagyd abba a könyvedet, már olyan jól haladtál!\n\nÜdvözlettel,\nKönyvÍró AI csapata'
  },
  { 
    id: 'promo', 
    name: 'Akciós ajánlat', 
    subject: 'Exkluzív ajánlat csak neked! 🎁',
    body: 'Szia {{name}}!\n\nKülönleges ajánlatot készítettünk számodra...\n\nÜdvözlettel,\nKönyvÍró AI csapata'
  },
  { 
    id: 'feedback', 
    name: 'Visszajelzés kérés', 
    subject: 'Hogy tetszik a KönyvÍró AI?',
    body: 'Szia {{name}}!\n\nSzeretjük, hogy velünk írod a könyvedet! Szeretnénk kérni a visszajelzésedet...\n\nÜdvözlettel,\nKönyvÍró AI csapata'
  },
];

export function SendEmailModal({ open, onOpenChange, user }: SendEmailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('custom');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      template: 'custom',
      subject: '',
      body: '',
    }
  });

  function handleTemplateChange(templateId: string) {
    setSelectedTemplate(templateId);
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const name = user?.full_name || 'Kedves Felhasználó';
      form.setValue('subject', template.subject);
      form.setValue('body', template.body.replace('{{name}}', name));
    }
  }

  async function onSubmit(data: FormData) {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Convert plain text to HTML with proper styling
      const htmlBody = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Ink Story</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="color: #333333; font-size: 16px; line-height: 1.6;">
              ${data.body.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #666666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Ink Story. Minden jog fenntartva.</p>
          </div>
        </div>
      `;

      // Call edge function to send email
      const { error } = await supabase.functions.invoke('send-admin-email', {
        body: {
          to: user.email,
          subject: data.subject,
          html: htmlBody,
          text: data.body,
        }
      });

      if (error) throw error;

      toast.success('Email elküldve!');
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error('Hiba történt: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Email küldése</DialogTitle>
          <DialogDescription>
            Címzett: {user.email}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormItem>
              <FormLabel>Sablon</FormLabel>
              <Select 
                value={selectedTemplate} 
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz sablont" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tárgy *</FormLabel>
                  <FormControl>
                    <Input placeholder="Email tárgya..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Üzenet *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Email szövege..." 
                      rows={8}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Mégse
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Küldés
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
