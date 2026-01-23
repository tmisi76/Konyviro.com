import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
  email: z.string().email("Érvényes email címet adj meg"),
  full_name: z.string().optional(),
  password: z.string().min(8, "Minimum 8 karakter").optional().or(z.literal('')),
  send_welcome_email: z.boolean().default(true),
  subscription_plan: z.string().default("free"),
});

type FormData = z.infer<typeof formSchema>;

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function AddUserModal({ open, onOpenChange, onSuccess }: AddUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      full_name: '',
      password: '',
      send_welcome_email: true,
      subscription_plan: 'free'
    }
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      // For now, we'll just show a message since we need an edge function
      // to create users with admin privileges
      toast.info('Felhasználó létrehozása funkció hamarosan elérhető');
      
      // When edge function is ready:
      // await supabase.functions.invoke('admin-create-user', { body: data });
      
      onSuccess();
    } catch (error: any) {
      toast.error('Hiba történt: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Új felhasználó hozzáadása</DialogTitle>
          <DialogDescription>
            Manuálisan adj hozzá új felhasználót a rendszerhez.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input placeholder="pelda@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teljes név</FormLabel>
                  <FormControl>
                    <Input placeholder="Kiss János" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jelszó</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="password" placeholder="Jelszó..." {...field} />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.setValue('password', generatePassword())}
                      >
                        Generálás
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Ha üresen hagyod, a felhasználó jelszó beállító emailt kap.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subscription_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Előfizetési csomag</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz csomagot" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Ingyenes</SelectItem>
                      <SelectItem value="hobby">Hobbi</SelectItem>
                      <SelectItem value="writer">Profi</SelectItem>
                      <SelectItem value="pro">Kiadó</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="send_welcome_email"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Üdvözlő email küldése</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Mégse
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Létrehozás
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
