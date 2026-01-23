import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  full_name: z.string().optional(),
  display_name: z.string().optional(),
  bio: z.string().optional(),
  subscription_tier: z.string(),
  monthly_word_limit: z.number().min(0),
  project_limit: z.number().min(0),
  extra_words_balance: z.number().min(0),
});

type FormData = z.infer<typeof formSchema>;

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    subscription_tier: string;
  } | null;
  onSuccess: () => void;
}

export function EditUserModal({ open, onOpenChange, user, onSuccess }: EditUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      display_name: '',
      bio: '',
      subscription_tier: 'free',
      monthly_word_limit: 5000,
      project_limit: 1,
      extra_words_balance: 0,
    }
  });

  useEffect(() => {
    if (user && open) {
      loadUserProfile();
    }
  }, [user, open]);

  async function loadUserProfile() {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setProfileData(data);
      form.reset({
        full_name: data.full_name || '',
        display_name: data.display_name || '',
        bio: data.bio || '',
        subscription_tier: data.subscription_tier || 'free',
        monthly_word_limit: data.monthly_word_limit || 5000,
        project_limit: data.project_limit || 1,
        extra_words_balance: data.extra_words_balance || 0,
      });
    }
  }

  async function onSubmit(data: FormData) {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          display_name: data.display_name,
          bio: data.bio,
          subscription_tier: data.subscription_tier,
          monthly_word_limit: data.monthly_word_limit,
          project_limit: data.project_limit,
          extra_words_balance: data.extra_words_balance,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Felhasználó adatai frissítve!');
      onSuccess();
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
          <DialogTitle>Felhasználó szerkesztése</DialogTitle>
          <DialogDescription>
            {user.email}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="subscription">Előfizetés</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TabsContent value="profile" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teljes név</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Megjelenítési név</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="subscription_tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Előfizetési csomag</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="free">Ingyenes</SelectItem>
                          <SelectItem value="hobby">Hobbi</SelectItem>
                          <SelectItem value="writer">Író</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthly_word_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Havi szólimit</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="project_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Projekt limit</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="extra_words_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra szó egyenleg</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Mégse
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mentés
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
