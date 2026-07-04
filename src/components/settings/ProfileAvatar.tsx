"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarCropModal } from "@/components/settings/AvatarCropModal";

/** Longest edge of the working image handed to the cropper. Big enough for a
 *  crisp crop, small enough to keep memory/CPU modest. */
const WORK_DIMENSION = 1024;

/**
 * Read an image File and downscale it to at most WORK_DIMENSION on its longest
 * edge, returning a data URL. Runs entirely in the browser so we never hold a
 * multi-megabyte original in memory.
 */
function fileToWorkingDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image."));
      img.onload = () => {
        const scale = Math.min(1, WORK_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process the image."));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileAvatar({
  name,
  initialImage,
}: {
  name: string;
  initialImage: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(initialImage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Cropper state — source image being adjusted.
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const letter = name.charAt(0).toUpperCase();

  async function save(nextImage: string) {
    setBusy(true);
    setError("");
    const previous = image;
    setImage(nextImage); // optimistic
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: nextImage }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save photo.");
      router.refresh();
    } catch (e) {
      setImage(previous); // roll back on failure
      setError(e instanceof Error ? e.message : "Could not save photo.");
    } finally {
      setBusy(false);
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError("");
    try {
      const working = await fileToWorkingDataUrl(file);
      setCropSrc(working); // open the adjust modal
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the image.");
    }
  }

  async function onCropSave(dataUrl: string) {
    setCropSrc(null);
    await save(dataUrl);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-xl font-extrabold text-white shadow-sm">
            {letter}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {image ? "Change photo" : "Upload photo"}
          </button>
          {image && (
            <>
              <button
                type="button"
                onClick={() => setCropSrc(image)}
                disabled={busy}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Adjust
              </button>
              <button
                type="button"
                onClick={() => save("")}
                disabled={busy}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            </>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
        ) : (
          <p className="mt-1.5 text-xs text-gray-400">JPG, PNG or WebP. Drag &amp; zoom to frame it.</p>
        )}
      </div>

      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          open={!!cropSrc}
          onCancel={() => setCropSrc(null)}
          onSave={onCropSave}
        />
      )}
    </div>
  );
}
