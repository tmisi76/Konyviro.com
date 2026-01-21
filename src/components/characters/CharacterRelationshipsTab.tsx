import { useState } from "react";
import { Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCharacterRelationships } from "@/hooks/useCharacters";
import type { Character, RelationshipType } from "@/types/character";
import { RELATIONSHIP_LABELS } from "@/types/character";

interface CharacterRelationshipsTabProps {
  characterId: string;
  characters: Character[];
}

export function CharacterRelationshipsTab({
  characterId,
  characters,
}: CharacterRelationshipsTabProps) {
  const { relationships, createRelationship, deleteRelationship } =
    useCharacterRelationships(characterId);
  const [isAdding, setIsAdding] = useState(false);
  const [newRelatedId, setNewRelatedId] = useState("");
  const [newType, setNewType] = useState<RelationshipType>("barat");
  const [newDescription, setNewDescription] = useState("");

  const availableCharacters = characters.filter(
    (c) => !relationships.some((r) => r.related_character_id === c.id)
  );

  const handleAdd = async () => {
    if (!newRelatedId) return;

    await createRelationship(newRelatedId, newType, newDescription || undefined);
    setIsAdding(false);
    setNewRelatedId("");
    setNewType("barat");
    setNewDescription("");
  };

  return (
    <div className="space-y-4">
      {/* Existing relationships */}
      {relationships.map((rel) => (
        <div
          key={rel.id}
          className="flex items-start gap-3 rounded-lg border border-border p-3"
        >
          {/* Avatar */}
          {rel.related_character?.avatar_url ? (
            <img
              src={rel.related_character.avatar_url}
              alt={rel.related_character.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{rel.related_character?.name}</span>
              <span className="text-sm text-muted-foreground">
                ({RELATIONSHIP_LABELS[rel.relationship_type]})
              </span>
            </div>
            {rel.description && (
              <p className="text-sm text-muted-foreground mt-1">{rel.description}</p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteRelationship(rel.id)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {/* Add new relationship */}
      {isAdding ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Karakter</label>
              <Select value={newRelatedId} onValueChange={setNewRelatedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz karaktert" />
                </SelectTrigger>
                <SelectContent>
                  {availableCharacters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kapcsolat típusa</label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as RelationshipType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Leírás (opcionális)</label>
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="A kapcsolat részletei..."
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>
              Mégse
            </Button>
            <Button onClick={handleAdd} disabled={!newRelatedId}>
              Hozzáadás
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full gap-2"
          disabled={availableCharacters.length === 0}
        >
          <Plus className="h-4 w-4" />
          {availableCharacters.length === 0
            ? "Nincs több karakter"
            : "Kapcsolat hozzáadása"}
        </Button>
      )}

      {relationships.length === 0 && !isAdding && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Még nincsenek kapcsolatok
        </p>
      )}
    </div>
  );
}
