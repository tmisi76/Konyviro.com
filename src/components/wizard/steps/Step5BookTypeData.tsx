import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";
import type { NonfictionBookType, BookTypeSpecificData } from "@/types/wizard";

interface Step5BookTypeDataProps {
  bookType: NonfictionBookType;
  initialData: BookTypeSpecificData | null;
  onSubmit: (data: BookTypeSpecificData, length: number) => void;
}

export function Step5BookTypeData({ bookType, initialData, onSubmit }: Step5BookTypeDataProps) {
  const [formData, setFormData] = useState<BookTypeSpecificData>(initialData || {});
  const [length, setLength] = useState<number>(25000);

  const updateField = <K extends keyof BookTypeSpecificData>(
    key: K,
    value: BookTypeSpecificData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, length);
  };

  const renderHowToForm = () => (
    <>
      <div className="space-y-2">
        <Label>Mi a konkrét skill/eredmény amit az olvasó el fog érni? *</Label>
        <Textarea
          value={formData.skillOutcome || ""}
          onChange={(e) => updateField("skillOutcome", e.target.value)}
          placeholder="Pl. Működő Facebook hirdetési kampányt indít"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label>Célközönség tudásszintje</Label>
        <RadioGroup
          value={formData.audienceLevel || "beginner"}
          onValueChange={(v) => updateField("audienceLevel", v as "beginner" | "intermediate" | "advanced")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "beginner", label: "Teljesen kezdő" },
            { value: "intermediate", label: "Van alapja" },
            { value: "advanced", label: "Haladó" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={opt.value} />
              <Label htmlFor={opt.value} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Milyen eszközökre/előfeltételekre lesz szükség?</Label>
        <Textarea
          value={formData.prerequisites || ""}
          onChange={(e) => updateField("prerequisites", e.target.value)}
          placeholder="Pl. Facebook fiók, havi 50.000 Ft hirdetési büdzsé"
        />
      </div>

      <div className="space-y-2">
        <Label>Könyv mélysége</Label>
        <RadioGroup
          value={formData.bookDepth || "comprehensive"}
          onValueChange={(v) => {
            updateField("bookDepth", v as "quick" | "comprehensive" | "full-course");
            setLength(v === "quick" ? 10000 : v === "comprehensive" ? 25000 : 50000);
          }}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "quick", label: "Gyors útmutató ~10k szó" },
            { value: "comprehensive", label: "Átfogó könyv ~25k szó" },
            { value: "full-course", label: "Teljes kurzuskönyv ~50k szó" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`depth-${opt.value}`} />
              <Label htmlFor={`depth-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </>
  );

  const renderThoughtLeadershipForm = () => (
    <>
      <div className="space-y-2">
        <Label>Mi a "Nagy Ötlet" amit át szeretnél adni? *</Label>
        <Textarea
          value={formData.bigIdea || ""}
          onChange={(e) => updateField("bigIdea", e.target.value)}
          placeholder="Pl. A siker nem a tehetségen múlik, hanem a rendszeres gyakorláson"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Mi a probléma a jelenlegi gondolkodással?</Label>
        <Textarea
          value={formData.currentProblem || ""}
          onChange={(e) => updateField("currentProblem", e.target.value)}
          placeholder="Pl. Mindenki azt hiszi, hogy..."
        />
      </div>

      <div className="space-y-2">
        <Label>Hangnem</Label>
        <RadioGroup
          value={formData.leadershipTone || "inspiring"}
          onValueChange={(v) => updateField("leadershipTone", v as "provocative" | "inspiring" | "scientific")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "provocative", label: "Provokatív/kihívó" },
            { value: "inspiring", label: "Inspiráló" },
            { value: "scientific", label: "Tudományos/elemző" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`tone-${opt.value}`} />
              <Label htmlFor={`tone-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Tervezett hosszúság: {(length / 1000).toFixed(0)}k szó</Label>
        <Slider
          value={[length]}
          onValueChange={([v]) => setLength(v)}
          min={10000}
          max={50000}
          step={5000}
        />
      </div>
    </>
  );

  const renderCaseStudyForm = () => (
    <>
      <div className="space-y-2">
        <Label>Hány esettanulmányt szeretnél?</Label>
        <RadioGroup
          value={formData.caseStudyCount || "3-5"}
          onValueChange={(v) => updateField("caseStudyCount", v as "3-5" | "6-10" | "10+")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "3-5", label: "3-5" },
            { value: "6-10", label: "6-10" },
            { value: "10+", label: "10+" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`count-${opt.value}`} />
              <Label htmlFor={`count-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Milyen típusú történetek?</Label>
        <RadioGroup
          value={formData.storyTypes || "mixed"}
          onValueChange={(v) => updateField("storyTypes", v as "success" | "mixed" | "turnaround")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "success", label: "Csak sikerek" },
            { value: "mixed", label: "Sikerek és kudarcok" },
            { value: "turnaround", label: "Fordulat-történetek" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`story-${opt.value}`} />
              <Label htmlFor={`story-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Iparág/terület fókusz</Label>
        <Input
          value={formData.industryFocus || ""}
          onChange={(e) => updateField("industryFocus", e.target.value)}
          placeholder="Pl. Magyar KKV-k, Tech startupok"
        />
      </div>

      <div className="space-y-2">
        <Label>Mit szeretnél bizonyítani ezekkel?</Label>
        <Textarea
          value={formData.thesisToProve || ""}
          onChange={(e) => updateField("thesisToProve", e.target.value)}
          placeholder="Pl. A kitartás minden esetben meghozta a sikert"
        />
      </div>

      <div className="space-y-2">
        <Label>Tervezett hosszúság: {(length / 1000).toFixed(0)}k szó</Label>
        <Slider value={[length]} onValueChange={([v]) => setLength(v)} min={10000} max={50000} step={5000} />
      </div>
    </>
  );

  const renderFrameworkForm = () => (
    <>
      <div className="space-y-2">
        <Label>Mi a módszertanod/keretrendszered neve? *</Label>
        <Input
          value={formData.methodologyName || ""}
          onChange={(e) => updateField("methodologyName", e.target.value)}
          placeholder="Pl. A 4D Értékesítési Rendszer"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Hány fő eleme/pillére van?</Label>
        <RadioGroup
          value={String(formData.elementCount || 4)}
          onValueChange={(v) => updateField("elementCount", Number(v) as 3 | 4 | 5 | 6)}
          className="flex flex-wrap gap-4"
        >
          {[3, 4, 5, 6].map((n) => (
            <div key={n} className="flex items-center space-x-2">
              <RadioGroupItem value={String(n)} id={`elem-${n}`} />
              <Label htmlFor={`elem-${n}`} className="cursor-pointer">{n === 6 ? "6+" : n}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Sorold fel az elemeket (egy per sor)</Label>
        <Textarea
          value={(formData.frameworkElements || []).join("\n")}
          onChange={(e) => updateField("frameworkElements", e.target.value.split("\n").filter(Boolean))}
          placeholder="Elem 1&#10;Elem 2&#10;Elem 3"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Milyen problémát old meg ez a rendszer?</Label>
        <Textarea
          value={formData.problemSolved || ""}
          onChange={(e) => updateField("problemSolved", e.target.value)}
          placeholder="Pl. Az értékesítők nem tudják lezárni az ügyleteket"
        />
      </div>

      <div className="space-y-2">
        <Label>Tervezett hosszúság: {(length / 1000).toFixed(0)}k szó</Label>
        <Slider value={[length]} onValueChange={([v]) => setLength(v)} min={10000} max={50000} step={5000} />
      </div>
    </>
  );

  const renderSelfHelpForm = () => (
    <>
      <div className="space-y-2">
        <Label>Milyen változást ígérsz az olvasónak? *</Label>
        <Textarea
          value={formData.promisedChange || ""}
          onChange={(e) => updateField("promisedChange", e.target.value)}
          placeholder="Pl. 30 nap alatt kialakítod a reggeli rutinod"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Mi az akadály amit leküzdenek?</Label>
        <Textarea
          value={formData.obstacleToOvercome || ""}
          onChange={(e) => updateField("obstacleToOvercome", e.target.value)}
          placeholder="Pl. Halogatás, motivációhiány"
        />
      </div>

      <div className="space-y-2">
        <Label>Tartalmaz-e konkrét gyakorlatokat?</Label>
        <RadioGroup
          value={formData.exerciseFrequency || "every-chapter"}
          onValueChange={(v) => updateField("exerciseFrequency", v as "every-chapter" | "some" | "theory-focused")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "every-chapter", label: "Igen, minden fejezetben" },
            { value: "some", label: "Néhány" },
            { value: "theory-focused", label: "Főleg elmélet" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`ex-${opt.value}`} />
              <Label htmlFor={`ex-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Időkeret</Label>
        <RadioGroup
          value={formData.programTimeframe || "30-day"}
          onValueChange={(v) => updateField("programTimeframe", v as "7-day" | "30-day" | "90-day" | "none")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "7-day", label: "7 napos program" },
            { value: "30-day", label: "30 napos" },
            { value: "90-day", label: "90 napos" },
            { value: "none", label: "Nincs időkeret" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`tf-${opt.value}`} />
              <Label htmlFor={`tf-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Tervezett hosszúság: {(length / 1000).toFixed(0)}k szó</Label>
        <Slider value={[length]} onValueChange={([v]) => setLength(v)} min={10000} max={50000} step={5000} />
      </div>
    </>
  );

  const renderStorytellingForm = () => (
    <>
      <div className="space-y-2">
        <Label>Ki a főszereplő?</Label>
        <RadioGroup
          value={formData.protagonistType || "self"}
          onValueChange={(v) => updateField("protagonistType", v as "fictional" | "self" | "real-anonymous")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "fictional", label: "Fiktív karakter" },
            { value: "self", label: "Én magam" },
            { value: "real-anonymous", label: "Valós személy álnéven" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`prot-${opt.value}`} />
              <Label htmlFor={`prot-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>A főhős kiinduló helyzete</Label>
        <Textarea
          value={formData.startingSituation || ""}
          onChange={(e) => updateField("startingSituation", e.target.value)}
          placeholder="Pl. Csődközeli vállalkozó, aki nem érti miért nem működik semmi"
        />
      </div>

      <div className="space-y-2">
        <Label>A fő tanulság/transzformáció</Label>
        <Textarea
          value={formData.mainTransformation || ""}
          onChange={(e) => updateField("mainTransformation", e.target.value)}
          placeholder="Pl. Rájön, hogy a rendszerek fontosabbak mint a célok"
        />
      </div>

      <div className="space-y-2">
        <Label>Hangnem</Label>
        <RadioGroup
          value={formData.storyTone || "inspiring"}
          onValueChange={(v) => updateField("storyTone", v as "inspiring" | "dramatic" | "humorous")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "inspiring", label: "Inspiráló" },
            { value: "dramatic", label: "Drámai" },
            { value: "humorous", label: "Humoros" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`st-${opt.value}`} />
              <Label htmlFor={`st-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Tervezett hosszúság: {(length / 1000).toFixed(0)}k szó</Label>
        <Slider value={[length]} onValueChange={([v]) => setLength(v)} min={10000} max={50000} step={5000} />
      </div>
    </>
  );

  const renderInterviewForm = () => (
    <>
      <div className="space-y-2">
        <Label>Hány szakértő/interjúalany?</Label>
        <RadioGroup
          value={formData.expertCount || "10-20"}
          onValueChange={(v) => updateField("expertCount", v as "5-10" | "10-20" | "20+")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "5-10", label: "5-10" },
            { value: "10-20", label: "10-20" },
            { value: "20+", label: "20+" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`exp-${opt.value}`} />
              <Label htmlFor={`exp-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Valós vagy fiktív interjúalanyok?</Label>
        <RadioGroup
          value={formData.expertType || "ai-generated"}
          onValueChange={(v) => updateField("expertType", v as "real" | "ai-generated")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "real", label: "Valós nevekkel" },
            { value: "ai-generated", label: "AI generált szakértők" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`type-${opt.value}`} />
              <Label htmlFor={`type-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Fő téma ami összeköti őket</Label>
        <Textarea
          value={formData.unifyingTheme || ""}
          onChange={(e) => updateField("unifyingTheme", e.target.value)}
          placeholder="Pl. Magyar vállalkozók akik 0-ról építettek milliárdos céget"
        />
      </div>

      <div className="space-y-2">
        <Label>Milyen kérdéseket tegyél fel mindenkinek? (egy per sor)</Label>
        <Textarea
          value={(formData.recurringQuestions || []).join("\n")}
          onChange={(e) => updateField("recurringQuestions", e.target.value.split("\n").filter(Boolean))}
          placeholder="Mi volt a legnagyobb hibád?&#10;Mi a reggeli rutinod?&#10;Melyik könyv változtatta meg az életed?"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Tervezett hosszúság: {(length / 1000).toFixed(0)}k szó</Label>
        <Slider value={[length]} onValueChange={([v]) => setLength(v)} min={10000} max={50000} step={5000} />
      </div>
    </>
  );

  const renderWorkbookForm = () => (
    <>
      <div className="space-y-2">
        <Label>Mi a munkafüzet célja? *</Label>
        <Textarea
          value={formData.workbookGoal || ""}
          onChange={(e) => updateField("workbookGoal", e.target.value)}
          placeholder="Pl. Üzleti terv készítése lépésről lépésre"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Hány modul/fejezet?</Label>
        <RadioGroup
          value={formData.moduleCount || "8-12"}
          onValueChange={(v) => updateField("moduleCount", v as "5-7" | "8-12" | "12+")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "5-7", label: "5-7" },
            { value: "8-12", label: "8-12" },
            { value: "12+", label: "12+" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`mod-${opt.value}`} />
              <Label htmlFor={`mod-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label>Gyakorlat típusok</Label>
        <div className="flex flex-wrap gap-4">
          {[
            { id: "templates", label: "Kitöltős sablonok" },
            { id: "reflection", label: "Reflexiós kérdések" },
            { id: "action-plans", label: "Cselekvési tervek" },
            { id: "self-assessment", label: "Önértékelések" },
            { id: "checklists", label: "Checklistek" },
          ].map((type) => (
            <div key={type.id} className="flex items-center space-x-2">
              <Checkbox
                id={type.id}
                checked={(formData.exerciseTypes || []).includes(type.id)}
                onCheckedChange={(checked) => {
                  const current = formData.exerciseTypes || [];
                  updateField(
                    "exerciseTypes",
                    checked ? [...current, type.id] : current.filter(t => t !== type.id)
                  );
                }}
              />
              <Label htmlFor={type.id} className="cursor-pointer">{type.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Van-e időkeret a feldolgozásra?</Label>
        <RadioGroup
          value={formData.processingTimeframe || "self-paced"}
          onValueChange={(v) => updateField("processingTimeframe", v as "1-week" | "30-day" | "self-paced")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "1-week", label: "1 hét" },
            { value: "30-day", label: "30 nap" },
            { value: "self-paced", label: "Saját tempó" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`proc-${opt.value}`} />
              <Label htmlFor={`proc-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Tervezett hosszúság: {(length / 1000).toFixed(0)}k szó</Label>
        <Slider value={[length]} onValueChange={([v]) => setLength(v)} min={10000} max={50000} step={5000} />
      </div>
    </>
  );

  const renderReferenceForm = () => (
    <>
      <div className="space-y-2">
        <Label>Milyen területet fed le? *</Label>
        <Textarea
          value={formData.coverageArea || ""}
          onChange={(e) => updateField("coverageArea", e.target.value)}
          placeholder="Pl. Kisvállalkozás marketing A-Z"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Célközönség</Label>
        <RadioGroup
          value={formData.referenceAudience || "both"}
          onValueChange={(v) => updateField("referenceAudience", v as "beginners" | "professionals" | "both")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "beginners", label: "Kezdők" },
            { value: "professionals", label: "Gyakorlott szakemberek" },
            { value: "both", label: "Mindkettő" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`aud-${opt.value}`} />
              <Label htmlFor={`aud-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Szerkezet</Label>
        <RadioGroup
          value={formData.referenceStructure || "thematic"}
          onValueChange={(v) => updateField("referenceStructure", v as "a-z" | "thematic" | "problem-based")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "a-z", label: "A-Z szótár stílus" },
            { value: "thematic", label: "Tematikus fejezetek" },
            { value: "problem-based", label: "Problémaalapú" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`struct-${opt.value}`} />
              <Label htmlFor={`struct-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Tervezett terjedelem</Label>
        <RadioGroup
          value={formData.referenceLength || "medium"}
          onValueChange={(v) => {
            updateField("referenceLength", v as "short" | "medium" | "comprehensive");
            setLength(v === "short" ? 15000 : v === "medium" ? 30000 : 50000);
          }}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "short", label: "Rövid ~15k szó" },
            { value: "medium", label: "Közepes ~30k szó" },
            { value: "comprehensive", label: "Átfogó ~50k+ szó" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`len-${opt.value}`} />
              <Label htmlFor={`len-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </>
  );

  const renderMemoirForm = () => (
    <>
      <div className="space-y-2">
        <Label>Milyen időszakot ölel fel a történet?</Label>
        <Input
          value={formData.timePeriod || ""}
          onChange={(e) => updateField("timePeriod", e.target.value)}
          placeholder="Pl. 2015-2023, a cégalapítástól az exitig"
        />
      </div>

      <div className="space-y-2">
        <Label>3 kulcs fordulópont a történetedben (egy per sor)</Label>
        <Textarea
          value={(formData.turningPoints || []).join("\n")}
          onChange={(e) => updateField("turningPoints", e.target.value.split("\n").filter(Boolean))}
          placeholder="Az első nagy ügyfél&#10;A válság ami majdnem tönkretett&#10;A váratlan áttörés"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>A fő tanulság amit át szeretnél adni</Label>
        <Textarea
          value={formData.mainLesson || ""}
          onChange={(e) => updateField("mainLesson", e.target.value)}
          placeholder="Pl. A kudarc az egyetlen út a sikerhez"
        />
      </div>

      <div className="space-y-2">
        <Label>Hangnem</Label>
        <RadioGroup
          value={formData.memoirTone || "inspiring"}
          onValueChange={(v) => updateField("memoirTone", v as "raw" | "inspiring" | "humorous")}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "raw", label: "Őszinte/nyers" },
            { value: "inspiring", label: "Inspiráló" },
            { value: "humorous", label: "Humoros/önironikus" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`mem-${opt.value}`} />
              <Label htmlFor={`mem-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Tervezett hosszúság: {(length / 1000).toFixed(0)}k szó</Label>
        <Slider value={[length]} onValueChange={([v]) => setLength(v)} min={10000} max={50000} step={5000} />
      </div>
    </>
  );

  const renderFormContent = () => {
    switch (bookType) {
      case "how-to": return renderHowToForm();
      case "thought-leadership": return renderThoughtLeadershipForm();
      case "case-study": return renderCaseStudyForm();
      case "framework": return renderFrameworkForm();
      case "self-help": return renderSelfHelpForm();
      case "storytelling-business": return renderStorytellingForm();
      case "interview": return renderInterviewForm();
      case "workbook": return renderWorkbookForm();
      case "reference": return renderReferenceForm();
      case "memoir": return renderMemoirForm();
      default: return null;
    }
  };

  const getBookTypeTitle = () => {
    const titles: Record<NonfictionBookType, string> = {
      "how-to": "How-To Útmutató",
      "thought-leadership": "Thought Leadership",
      "case-study": "Esettanulmány alapú",
      "framework": "Framework / Módszertan",
      "self-help": "Önfejlesztő",
      "storytelling-business": "Storytelling üzleti",
      "interview": "Interjú / Beszélgetések",
      "workbook": "Workbook / Munkafüzet",
      "reference": "Kézikönyv / Referencia",
      "memoir": "Memoir + Tanulságok",
    };
    return titles[bookType];
  };

  return (
    <div className="py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {getBookTypeTitle()} - Adatok
        </h1>
        <p className="text-muted-foreground">
          Add meg a könyved részleteit
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Optional title field for all types */}
        <div className="space-y-2">
          <Label>Könyv címe (opcionális)</Label>
          <Input
            value={formData.coverageArea === undefined ? "" : ""}
            onChange={() => {}}
            placeholder="Hagyd üresen, és az AI generál egyet"
          />
        </div>

        {renderFormContent()}

        <Button type="submit" className="w-full gap-2" size="lg">
          Tovább
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.form>
    </div>
  );
}
