import { useState, useEffect } from "react";
import { Share2, Copy, Check, Lock, Unlock, Download, Eye, Calendar, QrCode, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useBookShare } from "@/hooks/useBookShare";
import { toast } from "sonner";

interface ShareBookModalProps {
  projectId: string;
  projectTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareBookModal({ projectId, projectTitle, open, onOpenChange }: ShareBookModalProps) {
  const { share, isLoading, createShare, updateShare, deleteShare, getShareUrl } = useBookShare(projectId);
  
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [viewMode, setViewMode] = useState<"scroll" | "flipbook">("scroll");
  const [allowDownload, setAllowDownload] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Sync state with existing share
  useEffect(() => {
    if (share) {
      setIsPublic(share.is_public);
      setViewMode(share.view_mode);
      setAllowDownload(share.allow_download);
      setExpiresAt(share.expires_at ? share.expires_at.split("T")[0] : "");
    }
  }, [share]);

  const handleCreateShare = async () => {
    await createShare.mutateAsync({
      project_id: projectId,
      is_public: isPublic,
      password: !isPublic && password ? password : undefined,
      view_mode: viewMode,
      allow_download: allowDownload,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
  };

  const handleUpdateShare = async () => {
    if (!share) return;
    
    await updateShare.mutateAsync({
      shareId: share.id,
      input: {
        is_public: isPublic,
        password: !isPublic && password ? password : null,
        view_mode: viewMode,
        allow_download: allowDownload,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      },
    });
  };

  const handleDeleteShare = async () => {
    if (!share) return;
    if (!confirm("Biztosan törölni szeretnéd a megosztási linket?")) return;
    await deleteShare.mutateAsync(share.id);
  };

  const handleCopyLink = async () => {
    if (!share) return;
    const url = getShareUrl(share.share_token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link másolva!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = share ? getShareUrl(share.share_token) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Könyv megosztása
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Existing share link */}
          {share && (
            <div className="space-y-3">
              <Label>Megosztási link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {share.view_count} megtekintés
                </span>
              </div>
              <Separator />
            </div>
          )}

          {/* Public/Private toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPublic ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <Label htmlFor="public-toggle">Nyilvános</Label>
            </div>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Password (if not public) */}
          {!isPublic && (
            <div className="space-y-2">
              <Label htmlFor="password">Jelszó</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Add meg a jelszót..."
              />
            </div>
          )}

          <Separator />

          {/* View mode */}
          <div className="space-y-3">
            <Label>Nézet mód</Label>
            <RadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as "scroll" | "flipbook")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scroll" id="scroll" />
                <Label htmlFor="scroll" className="font-normal cursor-pointer">
                  Görgetős (Word-szerű)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flipbook" id="flipbook" />
                <Label htmlFor="flipbook" className="font-normal cursor-pointer">
                  Könyv (lapozós, 2 oldalas)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Additional options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <Label htmlFor="download-toggle">Letöltés engedélyezése</Label>
              </div>
              <Switch
                id="download-toggle"
                checked={allowDownload}
                onCheckedChange={setAllowDownload}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Label htmlFor="expires">Lejárati dátum (opcionális)</Label>
              </div>
              <Input
                id="expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {share ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteShare}
                disabled={deleteShare.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Törlés
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateShare}
                disabled={updateShare.isPending}
              >
                Mentés
              </Button>
            </>
          ) : (
            <Button
              className="w-full"
              onClick={handleCreateShare}
              disabled={createShare.isPending}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Megosztási link létrehozása
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
