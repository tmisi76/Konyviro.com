import { useState } from "react";
import { ArrowLeft, Settings, CreditCard, User, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { StyleSettings } from "@/components/settings/StyleSettings";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "subscription";
  const isMobile = useIsMobile();

  // Mobile accordion layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur-md">
          <div className="flex items-center gap-4 px-4 py-4">
            <Link
              to="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors touch-target"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">Beállítások</h1>
            </div>
          </div>
        </header>

        {/* Accordion Content */}
        <main className="px-4 py-6">
          <Accordion type="single" collapsible defaultValue={defaultTab} className="space-y-3">
            <AccordionItem value="subscription" className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Előfizetés</p>
                    <p className="text-xs text-muted-foreground">Csomag és fizetés kezelése</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <SubscriptionSettings />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="profile" className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                    <User className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Profil</p>
                    <p className="text-xs text-muted-foreground">Személyes adatok</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <ProfileSettings />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="style" className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Saját stílus</p>
                    <p className="text-xs text-muted-foreground">AI stílus elemzés</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <StyleSettings />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </main>
      </div>
    );
  }

  // Desktop tab layout
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Vissza</span>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Beállítások</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Előfizetés</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
              </TabsTrigger>
              <TabsTrigger value="style" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Saját stílus</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscription">
              <SubscriptionSettings />
            </TabsContent>

            <TabsContent value="profile">
              <ProfileSettings />
            </TabsContent>

            <TabsContent value="style">
              <StyleSettings />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
