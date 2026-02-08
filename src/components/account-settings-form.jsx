"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AccountSettingsForm({ user }) {
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();
  const supabase = createClient();

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U";

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2 MB.");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      // Append cache-buster so the browser picks up the new image
      const newUrl = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(newUrl);
    } catch (err) {
      toast.error(err.message || "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        avatar_url: avatarUrl,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated successfully.");
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-8">
      {/* Avatar Section */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="h-20 w-20 text-lg">
            <AvatarImage src={avatarUrl} alt={fullName || "Avatar"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div>
          <p className="font-medium">{fullName || "Your Name"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-sm text-primary hover:underline mt-1 cursor-pointer">
            {uploading ? "Uploading…" : "Change avatar"}
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fullName">Display Name</FieldLabel>
          <Input id="fullName" type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <FieldDescription>This is the name shown across the app.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" value={user.email} disabled className="opacity-60" />
          <FieldDescription>Your email cannot be changed here.</FieldDescription>
        </Field>

        <div>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
