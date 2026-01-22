import { useState, useRef } from "react";
import { 
  User, 
  Camera, 
  Trash2, 
  Globe, 
  Instagram, 
  Twitter, 
  Loader2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";

export function ProfileSettings() {
  const { user } = useAuth();
  const { profile, isLoading, isSaving, updateProfile, uploadAvatar, removeAvatar } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Local form state
  const [formData, setFormData] = useState({
    displayName: profile.displayName || "",
    fullName: profile.fullName || "",
    bio: profile.bio || "",
    website: profile.website || "",
    socialTwitter: profile.socialTwitter || "",
    socialInstagram: profile.socialInstagram || "",
  });
  
  // Update form when profile loads
  useState(() => {
    if (profile.userId) {
      setFormData({
        displayName: profile.displayName || "",
        fullName: profile.fullName || "",
        bio: profile.bio || "",
        website: profile.website || "",
        socialTwitter: profile.socialTwitter || "",
        socialInstagram: profile.socialInstagram || "",
      });
    }
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    setIsUploading(true);
    await uploadAvatar(file);
    setIsUploading(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    await removeAvatar();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(formData);
  };

  const getInitials = () => {
    const name = formData.displayName || formData.fullName || user?.email || "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Section */}
      <div className="rounded-xl border bg-card p-6 shadow-material-1">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Profilkép</h3>
        
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatarUrl || undefined} alt="Profilkép" />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            {/* Upload overlay */}
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100"
            >
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAvatarClick}
              disabled={isUploading}
            >
              <Camera className="mr-2 h-4 w-4" />
              Kép feltöltése
            </Button>
            
            {profile.avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Törlés
              </Button>
            )}
            
            <p className="text-xs text-muted-foreground">
              JPG, PNG vagy WebP. Max 2MB.
            </p>
          </div>
        </div>
      </div>

      {/* Personal Info Section */}
      <div className="rounded-xl border bg-card p-6 shadow-material-1">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Személyes adatok</h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayName">Megjelenítő név</Label>
            <Input
              id="displayName"
              placeholder="Hogyan szeretnéd, hogy szólítsunk?"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Ez jelenik meg a profilodon
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Teljes név</Label>
            <Input
              id="fullName"
              placeholder="Vezetéknév Keresztnév"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <Label htmlFor="email">Email cím</Label>
          <Input
            id="email"
            type="email"
            value={user?.email || ""}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Az email cím nem módosítható
          </p>
        </div>
        
        <div className="mt-4 space-y-2">
          <Label htmlFor="bio">Bemutatkozás</Label>
          <Textarea
            id="bio"
            placeholder="Írj pár sort magadról..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            maxLength={200}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {formData.bio.length}/200 karakter
          </p>
        </div>
      </div>

      {/* Links Section */}
      <div className="rounded-xl border bg-card p-6 shadow-material-1">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Linkek</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Weboldal
            </Label>
            <Input
              id="website"
              type="url"
              placeholder="https://..."
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="twitter" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" />
                Twitter / X
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  @
                </span>
                <Input
                  id="twitter"
                  placeholder="felhasznalonev"
                  value={formData.socialTwitter}
                  onChange={(e) => setFormData({ ...formData, socialTwitter: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  @
                </span>
                <Input
                  id="instagram"
                  placeholder="felhasznalonev"
                  value={formData.socialInstagram}
                  onChange={(e) => setFormData({ ...formData, socialInstagram: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mentés...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Mentés
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
