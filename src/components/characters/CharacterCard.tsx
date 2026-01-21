import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Character } from "@/types/character";
import { ROLE_LABELS, ROLE_COLORS } from "@/types/character";

interface CharacterCardProps {
  character: Character;
  onClick: () => void;
}

export function CharacterCard({ character, onClick }: CharacterCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <div className="relative">
            {character.avatar_url ? (
              <img
                src={character.avatar_url}
                alt={character.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <h3 className="font-medium text-foreground">{character.name}</h3>
            {character.nickname && (
              <p className="text-sm text-muted-foreground">"{character.nickname}"</p>
            )}
          </div>

          {/* Role badge */}
          <Badge className={cn("text-xs", ROLE_COLORS[character.role])}>
            {ROLE_LABELS[character.role]}
          </Badge>

          {/* Quick info */}
          {(character.age || character.occupation) && (
            <p className="text-xs text-muted-foreground">
              {character.age && `${character.age} éves`}
              {character.age && character.occupation && " • "}
              {character.occupation}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
