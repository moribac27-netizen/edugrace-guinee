import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StudentPhoto } from "./StudentPhoto";

type Props = {
  value: string | null;
  onChange: (path: string | null) => void;
  schoolId: string | null | undefined;
  name?: string | null;
};

export function StudentPhotoUpload({ value, onChange, schoolId, name }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!schoolId) return toast.error("École non identifiée");
    if (!file.type.startsWith("image/")) return toast.error("Merci de choisir une image");
    if (file.size > 5 * 1024 * 1024) return toast.error("Photo trop volumineuse (max 5 Mo)");
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${schoolId}/students/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("school-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      // Best-effort: remove old photo if it lives in our bucket path
      if (value && value.startsWith(`${schoolId}/students/`)) {
        await supabase.storage.from("school-assets").remove([value]).catch(() => {});
      }
      onChange(path);
      toast.success("Photo enregistrée");
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'envoi");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!value) return;
    if (!confirm("Supprimer la photo ?")) return;
    setBusy(true);
    try {
      if (value.startsWith(`${schoolId}/students/`)) {
        await supabase.storage.from("school-assets").remove([value]).catch(() => {});
      }
      onChange(null);
      toast.success("Photo supprimée");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <StudentPhoto path={value} name={name} size="xl" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => galleryRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            <span className="ml-2">Choisir une image</span>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => cameraRef.current?.click()} disabled={busy}>
            <Camera className="size-4" />
            <span className="ml-2">Prendre une photo</span>
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={busy}>
              <Trash2 className="size-4 text-destructive" />
              <span className="ml-2">Supprimer</span>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG — max 5 Mo. Sécurisé et privé à votre école.</p>
      </div>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}
