import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  NONFICTION_BOOK_TYPES, 
  type NonfictionBookType 
} from "@/types/wizard";

interface Step3BookTypeProps {
  selected: NonfictionBookType | null;
  onSelect: (type: NonfictionBookType) => void;
}

export function Step3BookType({ selected, onSelect }: Step3BookTypeProps) {
  return (
    <div className="py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Milyen stílusú könyvet szeretnél írni?
        </h1>
        <p className="text-muted-foreground">
          A könyv stílusa meghatározza a struktúrát és a hangnemet
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
        {NONFICTION_BOOK_TYPES.map((type) => {
          const isSelected = selected === type.id;
          
          return (
            <motion.button
              key={type.id}
              onClick={() => onSelect(type.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all",
                "hover:border-primary/50 hover:shadow-lg",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected 
                  ? "border-green-500 bg-green-500/10 shadow-lg" 
                  : "border-border bg-card"
              )}
            >
              {/* Check icon when selected */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}

              {/* Icon */}
              <div className="text-3xl mb-3">{type.icon}</div>

              {/* Title */}
              <h3 className="font-semibold text-foreground mb-1.5 pr-6">
                {type.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {type.description}
              </p>

              {/* Example */}
              <p className="text-xs text-muted-foreground/70 italic">
                Pl.: {type.example}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
