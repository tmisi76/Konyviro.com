import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Genre, Subcategory } from "@/types/wizard";
import { FICTION_SUBCATEGORIES, NONFICTION_SUBCATEGORIES } from "@/types/wizard";
import { useAdultVerification } from "@/hooks/useAdultVerification";
import { AgeVerificationModal } from "@/components/projects/AgeVerificationModal";
import { useState } from "react";

interface Step2SubcategoryProps {
  genre: Genre;
  selected: Subcategory | null;
  onSelect: (subcategory: Subcategory) => void;
}

export function Step2Subcategory({ genre, selected, onSelect }: Step2SubcategoryProps) {
  const categories = genre === "fiction" ? FICTION_SUBCATEGORIES : NONFICTION_SUBCATEGORIES;
  const { isVerified, verifyAdultContent } = useAdultVerification();
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<Subcategory | null>(null);

  const handleSelect = (category: typeof categories[0]) => {
    if ("isAdult" in category && category.isAdult && !isVerified) {
      setPendingCategory(category.id);
      setShowAgeModal(true);
      return;
    }
    onSelect(category.id);
  };

  const handleAgeConfirm = async () => {
    await verifyAdultContent();
    setShowAgeModal(false);
    if (pendingCategory) {
      onSelect(pendingCategory);
      setPendingCategory(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Válaszd ki a kategóriát
        </h1>
        <p className="text-muted-foreground text-lg">
          {genre === "fiction" 
            ? "Milyen történetet szeretnél elmesélni?" 
            : "Milyen témában írsz szakkönyvet?"}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 w-full max-w-4xl">
        {categories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(category)}
            className={cn(
              "group relative p-4 rounded-xl border-2 transition-all duration-200",
              "flex flex-col items-center text-center gap-2",
              "bg-card hover:bg-accent/10",
              selected === category.id
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/40"
            )}
          >
            <span className="text-3xl">{category.icon}</span>
            <span className="font-medium text-sm">{category.title}</span>
            
            {category.isAdult && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs px-1.5">
                18+
              </Badge>
            )}

            {selected === category.id && (
              <motion.div
                layoutId="subcategory-check"
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              >
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      <AgeVerificationModal
        open={showAgeModal}
        onOpenChange={setShowAgeModal}
        onConfirm={handleAgeConfirm}
        onCancel={() => {
          setShowAgeModal(false);
          setPendingCategory(null);
        }}
      />
    </div>
  );
}
