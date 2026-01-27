import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Upload, 
  X, 
  User, 
  Star, 
  Users,
  Loader2,
  ImagePlus,
  ArrowRight,
  Pencil,
  Sparkles,
} from "lucide-react";
import { CharacterPhoto, CharacterProfile } from "@/types/storybook";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StorybookCharactersStepProps {
  characters: CharacterPhoto[];
  onAddCharacter: (character: CharacterPhoto) => void;
  onRemoveCharacter: (characterId: string) => void;
  onUpdateCharacter: (characterId: string, updates: Partial<CharacterPhoto>) => void;
  onUploadPhoto: (file: File) => Promise<string | null>;
  onComplete: () => void;
}

export function StorybookCharactersStep({
  characters,
  onAddCharacter,
  onRemoveCharacter,
  onUpdateCharacter,
  onUploadPhoto,
  onComplete,
}: StorybookCharactersStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CharacterProfile | null>(null);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);

  const analyzeCharacterPhoto = useCallback(async (characterId: string, imageUrl: string) => {
    // Set analyzing state
    onUpdateCharacter(characterId, { isAnalyzing: true });

    try {
      const { data, error } = await supabase.functions.invoke("analyze-character-photo", {
        body: { imageUrl },
      });

      if (error) {
        console.error("Character analysis error:", error);
        toast.error("Nem sikerült elemezni a fotót");
        onUpdateCharacter(characterId, { isAnalyzing: false });
        return;
      }

      if (data?.profile) {
        onUpdateCharacter(characterId, {
          profile: data.profile,
          isAnalyzing: false,
        });
        toast.success("Karakter profil elkészült!");
      } else {
        onUpdateCharacter(characterId, { isAnalyzing: false });
      }
    } catch (err) {
      console.error("Character analysis failed:", err);
      toast.error("Hiba történt az elemzés során");
      onUpdateCharacter(characterId, { isAnalyzing: false });
    }
  }, [onUpdateCharacter]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (characters.length >= 3) {
      toast.error("Maximum 3 szereplőt adhatsz hozzá");
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Csak képfájlokat tölthetsz fel");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("A fájl mérete maximum 10MB lehet");
      return;
    }

    setIsUploading(true);
    try {
      const url = await onUploadPhoto(file);
      if (url) {
        const newCharacter: CharacterPhoto = {
          id: `char-${Date.now()}`,
          originalUrl: url,
          name: "",
          role: characters.length === 0 ? "main" : "supporting",
          isAnalyzing: true,
        };
        onAddCharacter(newCharacter);
        setEditingId(newCharacter.id);
        toast.success("Fotó feltöltve! Elemzés folyamatban...");
        
        // Start automatic analysis
        analyzeCharacterPhoto(newCharacter.id, url);
      }
    } catch (error) {
      toast.error("Hiba a feltöltés során");
    } finally {
      setIsUploading(false);
    }
  }, [characters, onUploadPhoto, onAddCharacter, analyzeCharacterPhoto]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    disabled: isUploading || characters.length >= 3,
    onDropRejected: (rejections) => {
      const rejection = rejections[0];
      if (rejection?.errors?.some(e => e.code === 'file-invalid-type')) {
        toast.error("Ez a képformátum nem támogatott. Kérlek használj JPG, PNG vagy WebP formátumot.");
      }
    },
  });

  const handleContinue = () => {
    if (characters.length === 0) {
      toast.error("Adj hozzá legalább egy szereplőt");
      return;
    }

    const mainCharacter = characters.find(c => c.role === "main");
    if (!mainCharacter?.name) {
      toast.error("Add meg a főszereplő nevét");
      return;
    }

    // Check if any character is still analyzing
    const stillAnalyzing = characters.some(c => c.isAnalyzing);
    if (stillAnalyzing) {
      toast.error("Várd meg, amíg az elemzés befejeződik");
      return;
    }

    onComplete();
  };

  const openEditModal = (character: CharacterPhoto) => {
    setEditingCharacterId(character.id);
    setEditingProfile(character.profile || {});
    setEditModalOpen(true);
  };

  const saveProfileEdit = () => {
    if (editingCharacterId && editingProfile) {
      onUpdateCharacter(editingCharacterId, { profile: editingProfile });
      toast.success("Profil mentve!");
    }
    setEditModalOpen(false);
    setEditingCharacterId(null);
    setEditingProfile(null);
  };

  return (
    <div className="flex flex-col items-center min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-6xl mb-4">📸✨</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Ki legyen a mese hőse?
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Töltsd fel a gyermeked vagy családtagjaid fotóját, és ők lesznek a mese szereplői!
          Az AI mesekönyv stílusú illusztrációkká alakítja a képeket.
        </p>
      </motion.div>

      {/* Upload area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-2xl mb-8"
      >
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300",
            isDragActive 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50 hover:bg-accent/5",
            (isUploading || characters.length >= 3) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Feltöltés folyamatban...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ImagePlus className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-medium text-lg">
                  {isDragActive ? "Engedd el a fotót" : "Húzd ide a fotót vagy kattints"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  JPG, PNG vagy WebP • Max 10MB • {3 - characters.length} hely maradt
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Characters list */}
      <div className="w-full max-w-2xl space-y-4 mb-8">
        <AnimatePresence>
          {characters.map((character, index) => (
            <motion.div
              key={character.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative p-4 rounded-xl border-2 bg-card",
                character.role === "main" 
                  ? "border-amber-400/50 bg-amber-50/5" 
                  : "border-border"
              )}
            >
              {/* Role badge */}
              <div className="absolute -top-2 -left-2">
                {character.role === "main" ? (
                  <div className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    <Star className="w-3 h-3" />
                    Főszereplő
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    <Users className="w-3 h-3" />
                    Mellékszereplő
                  </div>
                )}
              </div>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => onRemoveCharacter(character.id)}
                disabled={character.isAnalyzing}
              >
                <X className="w-4 h-4" />
              </Button>

              <div className="flex gap-4 mt-4">
                {/* Photo preview with analyzing overlay */}
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={character.originalUrl}
                    alt={character.name || "Szereplő"}
                    className={cn(
                      "w-full h-full object-cover transition-opacity",
                      character.isAnalyzing && "opacity-50"
                    )}
                  />
                  {character.isAnalyzing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="flex flex-col items-center gap-1">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                        <span className="text-[10px] text-white font-medium">Elemzés...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Character details */}
                <div className="flex-1 space-y-3">
                  <div>
                    <Label htmlFor={`name-${character.id}`} className="text-sm">
                      Név *
                    </Label>
                    <Input
                      id={`name-${character.id}`}
                      value={character.name}
                      onChange={(e) => onUpdateCharacter(character.id, { name: e.target.value })}
                      placeholder="Pl.: Bence, Anna"
                      className="mt-1"
                      disabled={character.isAnalyzing}
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label htmlFor={`role-${character.id}`} className="text-sm">
                        Szerep
                      </Label>
                      <Select
                        value={character.role}
                        onValueChange={(value) => onUpdateCharacter(character.id, { role: value as "main" | "supporting" })}
                        disabled={character.isAnalyzing}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main">Főszereplő</SelectItem>
                          <SelectItem value="supporting">Mellékszereplő</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Profile summary */}
                  {character.profile && !character.isAnalyzing && (
                    <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-xs font-semibold">AI Profil</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEditModal(character)}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Szerkesztés
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {character.profile.gender && (
                          <div>
                            <span className="text-muted-foreground">Nem:</span>{" "}
                            <span className="font-medium">{character.profile.gender}</span>
                          </div>
                        )}
                        {character.profile.age && (
                          <div>
                            <span className="text-muted-foreground">Kor:</span>{" "}
                            <span className="font-medium">{character.profile.age}</span>
                          </div>
                        )}
                        {character.profile.hairColor && (
                          <div>
                            <span className="text-muted-foreground">Haj:</span>{" "}
                            <span className="font-medium">{character.profile.hairColor}</span>
                          </div>
                        )}
                        {character.profile.eyeColor && (
                          <div>
                            <span className="text-muted-foreground">Szem:</span>{" "}
                            <span className="font-medium">{character.profile.eyeColor}</span>
                          </div>
                        )}
                      </div>
                      {character.profile.fullDescription && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {character.profile.fullDescription}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Original description field (hidden if profile exists) */}
                  {!character.profile && !character.isAnalyzing && (
                    <div>
                      <Label htmlFor={`desc-${character.id}`} className="text-sm">
                        Leírás (opcionális)
                      </Label>
                      <Input
                        id={`desc-${character.id}`}
                        value={character.description || ""}
                        onChange={(e) => onUpdateCharacter(character.id, { description: e.target.value })}
                        placeholder="Pl.: 5 éves, szeret focizni"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {characters.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-muted-foreground"
          >
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Még nincs szereplő hozzáadva</p>
            <p className="text-sm">Töltsd fel az első fotót a fenti mezőbe</p>
          </motion.div>
        )}
      </div>

      {/* Continue button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={characters.length === 0 || characters.some(c => c.isAnalyzing)}
          className="gap-2"
        >
          {characters.some(c => c.isAnalyzing) ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Elemzés folyamatban...
            </>
          ) : (
            <>
              Tovább
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 max-w-2xl"
      >
        <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
          💡 Tippek a legjobb eredményhez
        </h3>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
          <li>• Használj jó minőségű, éles fotót</li>
          <li>• Az arc legyen jól látható és szemből</li>
          <li>• Egyszerű háttér előtt készült kép ideális</li>
          <li>• Portré vagy félalakos kép működik legjobban</li>
        </ul>
      </motion.div>

      {/* Edit Profile Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Karakter Profil Szerkesztése
            </DialogTitle>
            <DialogDescription>
              Finomítsd az AI által generált leírást, hogy az illusztrációk pontosabbak legyenek.
            </DialogDescription>
          </DialogHeader>

          {editingProfile && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-gender">Nem</Label>
                  <Input
                    id="edit-gender"
                    value={editingProfile.gender || ""}
                    onChange={(e) => setEditingProfile({ ...editingProfile, gender: e.target.value })}
                    placeholder="Pl.: kislány"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-age">Kor</Label>
                  <Input
                    id="edit-age"
                    value={editingProfile.age || ""}
                    onChange={(e) => setEditingProfile({ ...editingProfile, age: e.target.value })}
                    placeholder="Pl.: kb. 5 éves"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-hairColor">Hajszín</Label>
                  <Input
                    id="edit-hairColor"
                    value={editingProfile.hairColor || ""}
                    onChange={(e) => setEditingProfile({ ...editingProfile, hairColor: e.target.value })}
                    placeholder="Pl.: szőke"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-hairStyle">Hajstílus</Label>
                  <Input
                    id="edit-hairStyle"
                    value={editingProfile.hairStyle || ""}
                    onChange={(e) => setEditingProfile({ ...editingProfile, hairStyle: e.target.value })}
                    placeholder="Pl.: rövid, göndör"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-eyeColor">Szemszín</Label>
                  <Input
                    id="edit-eyeColor"
                    value={editingProfile.eyeColor || ""}
                    onChange={(e) => setEditingProfile({ ...editingProfile, eyeColor: e.target.value })}
                    placeholder="Pl.: kék"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-clothing">Ruházat</Label>
                  <Input
                    id="edit-clothing"
                    value={editingProfile.clothing || ""}
                    onChange={(e) => setEditingProfile({ ...editingProfile, clothing: e.target.value })}
                    placeholder="Pl.: piros póló"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-features">Megkülönböztető jegyek</Label>
                <Input
                  id="edit-features"
                  value={editingProfile.distinguishingFeatures || ""}
                  onChange={(e) => setEditingProfile({ ...editingProfile, distinguishingFeatures: e.target.value })}
                  placeholder="Pl.: szeplős orr, nagy mosoly"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-fullDescription">Teljes leírás</Label>
                <Textarea
                  id="edit-fullDescription"
                  value={editingProfile.fullDescription || ""}
                  onChange={(e) => setEditingProfile({ ...editingProfile, fullDescription: e.target.value })}
                  placeholder="Részletes leírás az illusztrátornak..."
                  className="mt-1 min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ez a leírás segít az AI-nak konzisztensen megrajzolni a karaktert minden oldalon.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Mégse
            </Button>
            <Button onClick={saveProfileEdit}>
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
