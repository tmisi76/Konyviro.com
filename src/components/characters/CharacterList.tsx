import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CharacterCard } from "./CharacterCard";
import { CharacterDetailModal } from "./CharacterDetailModal";
import { useCharacters } from "@/hooks/useCharacters";
import type { Character, CharacterRole } from "@/types/character";
import { ROLE_LABELS } from "@/types/character";

interface CharacterListProps {
  projectId: string;
}

export function CharacterList({ projectId }: CharacterListProps) {
  const { characters, isLoading, createCharacter, updateCharacter, deleteCharacter } =
    useCharacters(projectId);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterRole, setNewCharacterRole] = useState<CharacterRole>("mellekszereploő");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newCharacterName.trim()) return;

    setIsCreating(true);
    const character = await createCharacter(newCharacterName.trim(), newCharacterRole);
    setIsCreating(false);

    if (character) {
      setIsCreateDialogOpen(false);
      setNewCharacterName("");
      setNewCharacterRole("mellekszereploő");
      setSelectedCharacter(character);
    }
  };

  const handleUpdate = async (updates: Partial<Character>) => {
    if (!selectedCharacter) return;
    const success = await updateCharacter(selectedCharacter.id, updates);
    if (success) {
      setSelectedCharacter((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const handleDelete = async () => {
    if (!selectedCharacter) return;
    const success = await deleteCharacter(selectedCharacter.id);
    if (success) {
      setSelectedCharacter(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Karakterek</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Új karakter
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onClick={() => setSelectedCharacter(character)}
          />
        ))}

        {/* Add character card */}
        <Card
          className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-muted/50"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Plus className="h-8 w-8" />
            <span className="text-sm">Új karakter</span>
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új karakter létrehozása</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Név</label>
              <Input
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                placeholder="Karakter neve"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Szerep</label>
              <Select
                value={newCharacterRole}
                onValueChange={(v) => setNewCharacterRole(v as CharacterRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
              Mégse
            </Button>
            <Button onClick={handleCreate} disabled={!newCharacterName.trim() || isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Létrehozás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Character detail modal */}
      {selectedCharacter && (
        <CharacterDetailModal
          character={selectedCharacter}
          characters={characters.filter((c) => c.id !== selectedCharacter.id)}
          isOpen={!!selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
