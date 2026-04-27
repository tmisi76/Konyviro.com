import { useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, Position, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCharacters } from "@/hooks/useCharacters";
import { RELATIONSHIP_LABELS, type RelationshipType, type Character } from "@/types/character";

interface Props {
  projectId: string;
}

const RELATION_COLORS: Record<RelationshipType, string> = {
  barat: "hsl(142, 71%, 45%)",
  ellenseg: "hsl(0, 84%, 60%)",
  szerelmi: "hsl(330, 81%, 60%)",
  csaladi: "hsl(38, 92%, 50%)",
  munkatars: "hsl(217, 91%, 60%)",
  egyeb: "hsl(220, 9%, 46%)",
};

const ROLE_BG: Record<string, string> = {
  foszereploő: "hsl(var(--primary))",
  mellekszereploő: "hsl(var(--secondary))",
  antagonista: "hsl(0, 84%, 60%)",
  mellekszerep: "hsl(var(--muted))",
};

interface RawRel {
  id: string;
  character_id: string;
  related_character_id: string;
  relationship_type: string;
  description: string | null;
}

export function CharacterNetworkGraph({ projectId }: Props) {
  const { characters, isLoading: charsLoading } = useCharacters(projectId);
  const [relationships, setRelationships] = useState<RawRel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const charIds = characters.map((c) => c.id);
      if (charIds.length === 0) {
        setRelationships([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("character_relationships")
        .select("id, character_id, related_character_id, relationship_type, description")
        .in("character_id", charIds);
      if (!cancelled) {
        setRelationships((data ?? []) as RawRel[]);
        setLoading(false);
      }
    }
    if (!charsLoading) load();
    return () => { cancelled = true; };
  }, [characters, charsLoading]);

  const { nodes, edges } = useMemo(() => {
    if (characters.length === 0) return { nodes: [], edges: [] };

    // Circular layout
    const radius = Math.max(220, characters.length * 35);
    const centerX = 400;
    const centerY = 300;
    const angleStep = (2 * Math.PI) / characters.length;

    const nodes: Node[] = characters.map((c: Character, i: number) => ({
      id: c.id,
      data: { label: c.name + (c.role ? `\n(${c.role})` : "") },
      position: {
        x: centerX + radius * Math.cos(i * angleStep - Math.PI / 2),
        y: centerY + radius * Math.sin(i * angleStep - Math.PI / 2),
      },
      style: {
        background: ROLE_BG[c.role] ?? "hsl(var(--card))",
        color: "hsl(var(--primary-foreground))",
        border: "2px solid hsl(var(--border))",
        borderRadius: 12,
        padding: 10,
        fontSize: 12,
        fontWeight: 600,
        width: 140,
        textAlign: "center" as const,
        whiteSpace: "pre-line" as const,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

    const edges: Edge[] = relationships
      .filter((r) => characters.some((c) => c.id === r.related_character_id))
      .map((r) => {
        const type = r.relationship_type as RelationshipType;
        const color = RELATION_COLORS[type] ?? RELATION_COLORS.egyeb;
        return {
          id: r.id,
          source: r.character_id,
          target: r.related_character_id,
          label: RELATIONSHIP_LABELS[type] ?? type,
          labelStyle: { fontSize: 11, fontWeight: 600, fill: color },
          labelBgStyle: { fill: "hsl(var(--background))", fillOpacity: 0.9 },
          labelBgPadding: [4, 4] as [number, number],
          labelBgBorderRadius: 4,
          style: { stroke: color, strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
          animated: type === "szerelmi" || type === "ellenseg",
        } satisfies Edge;
      });

    return { nodes, edges };
  }, [characters, relationships]);

  if (charsLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Network className="h-12 w-12 mb-3 opacity-40" />
        <p>Még nincsenek karakterek ehhez a projekthez.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground font-medium">Kapcsolat típusok:</span>
        {(Object.keys(RELATION_COLORS) as RelationshipType[]).map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5" style={{ background: RELATION_COLORS[t] }} />
            <span>{RELATIONSHIP_LABELS[t]}</span>
          </div>
        ))}
      </div>
      <div style={{ height: "70vh" }} className="border border-border rounded-lg overflow-hidden bg-muted/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  );
}