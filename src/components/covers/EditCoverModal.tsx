import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Paintbrush, Eraser, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Cover {
  id: string;
  image_url: string | null;
  project_id: string;
  prompt: string;
  style: string;
}

interface EditCoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cover: Cover | null;
}

export const EditCoverModal: React.FC<EditCoverModalProps> = ({
  open,
  onOpenChange,
  cover,
}) => {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [editPrompt, setEditPrompt] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState([30]);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [canvasReady, setCanvasReady] = useState(false);

  // Initialize canvas when modal opens
  useEffect(() => {
    if (open && cover?.image_url && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        // Set canvas to match image aspect ratio (book cover 2:3)
        const maxHeight = 400;
        const aspectRatio = img.width / img.height;
        canvas.height = maxHeight;
        canvas.width = maxHeight * aspectRatio;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setCanvasReady(true);
      };
      img.src = cover.image_url;
    }
  }, [open, cover?.image_url]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setEditPrompt('');
      setCanvasReady(false);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [open]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red for mask
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, brushSize[0] / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const getMaskBase64 = (): string => {
    if (!canvasRef.current) return '';
    // Convert the red mask to a proper black/white mask
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Create a new canvas for the mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return '';
    
    // Fill with black (areas to keep)
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Create white areas where user drew (areas to edit)
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    for (let i = 0; i < data.length; i += 4) {
      // Check if pixel has red color (mask)
      if (data[i + 3] > 0) {
        maskData.data[i] = 255;     // R
        maskData.data[i + 1] = 255; // G
        maskData.data[i + 2] = 255; // B
        maskData.data[i + 3] = 255; // A
      }
    }
    maskCtx.putImageData(maskData, 0, 0);
    
    return maskCanvas.toDataURL('image/png').split(',')[1];
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!cover) throw new Error('No cover selected');
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('Nincs bejelentkezve');
      }

      const maskB64 = getMaskBase64();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-cover-inpainting`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            original_cover_id: cover.id,
            edit_prompt: editPrompt,
            mask_b64: maskB64,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hiba a szerkesztés során');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['covers', cover?.project_id] });
      toast({
        title: 'Borító szerkesztve!',
        description: 'Az új változat sikeresen létrejött.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Hiba',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPrompt.trim()) {
      toast({
        title: 'Hiányzó leírás',
        description: 'Kérlek írd le, mit szeretnél változtatni.',
        variant: 'destructive',
      });
      return;
    }
    editMutation.mutate();
  };

  if (!cover) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Borító Szerkesztése</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image and Canvas Overlay */}
          <div className="relative flex justify-center bg-muted/50 rounded-lg p-4">
            <div className="relative" style={{ maxHeight: '400px' }}>
              {cover.image_url && (
                <img
                  src={cover.image_url}
                  alt="Cover to edit"
                  className="max-h-[400px] w-auto rounded-lg"
                  style={{ display: canvasReady ? 'block' : 'none' }}
                />
              )}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 cursor-crosshair rounded-lg"
                style={{ 
                  touchAction: 'none',
                  display: canvasReady ? 'block' : 'none',
                }}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
              />
              {!canvasReady && (
                <div className="flex items-center justify-center h-[400px] w-[267px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Drawing Tools */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tool === 'brush' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('brush')}
              >
                <Paintbrush className="h-4 w-4 mr-1" />
                Ecset
              </Button>
              <Button
                type="button"
                variant={tool === 'eraser' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('eraser')}
              >
                <Eraser className="h-4 w-4 mr-1" />
                Radír
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCanvas}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Törlés
              </Button>
            </div>
            
            <div className="flex items-center gap-2 flex-1 min-w-[150px]">
              <Label className="text-sm whitespace-nowrap">Ecset méret:</Label>
              <Slider
                value={brushSize}
                onValueChange={setBrushSize}
                min={5}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-8">{brushSize[0]}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Fesd be a módosítani kívánt területet, majd írd le, mit szeretnél változtatni.
          </p>

          {/* Edit Prompt */}
          <div className="space-y-2">
            <Label htmlFor="edit-prompt">Mit szeretnél változtatni?</Label>
            <Input
              id="edit-prompt"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Pl: Adj hozzá egy sárkányt, változtasd kékre az eget..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={editMutation.isPending}>
              {editMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Feldolgozás...
                </>
              ) : (
                'Szerkesztés Mentése'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
