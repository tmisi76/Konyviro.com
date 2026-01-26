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
  Upload, 
  X, 
  User, 
  Star, 
  Users,
  Loader2,
  ImagePlus,
  ArrowRight,
} from "lucide-react";
import { CharacterPhoto } from "@/types/storybook";
import { toast } from "sonner";

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
        };
        onAddCharacter(newCharacter);
        setEditingId(newCharacter.id);
        toast.success("Fotó feltöltve!");
      }
    } catch (error) {
      toast.error("Hiba a feltöltés során");
    } finally {
      setIsUploading(false);
    }
  }, [characters, onUploadPhoto, onAddCharacter]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
    disabled: isUploading || characters.length >= 3,
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

    onComplete();
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
              >
                <X className="w-4 h-4" />
              </Button>

              <div className="flex gap-4 mt-4">
                {/* Photo preview */}
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={character.originalUrl}
                    alt={character.name || "Szereplő"}
                    className="w-full h-full object-cover"
                  />
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
          disabled={characters.length === 0}
          className="gap-2"
        >
          Tovább
          <ArrowRight className="w-4 h-4" />
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
    </div>
  );
}
