"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/** On-screen size of the square crop window, and the exported photo size. */
const VIEW = 260;
const OUT = 256;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Square avatar cropper. The user drags to reposition and uses the slider to
 * zoom; on save the visible square is rendered to a 256×256 JPEG data URL.
 * No external libraries — just pointer events and a canvas.
 */
export function AvatarCropModal({
  src,
  open,
  onCancel,
  onSave,
}: {
  src: string;
  open: boolean;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Cover-fit base scale, then multiply by the zoom factor.
  const baseScale = dims ? VIEW / Math.min(dims.w, dims.h) : 1;
  const scale = baseScale * zoom;
  const dispW = dims ? dims.w * scale : 0;
  const dispH = dims ? dims.h * scale : 0;

  const clampOffset = (x: number, y: number) => ({
    x: clamp(x, VIEW - dispW, 0),
    y: clamp(y, VIEW - dispH, 0),
  });

  // Load the source, capture natural size, and center it in the window.
  useEffect(() => {
    if (!open) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const s = VIEW / Math.min(img.width, img.height);
      setDims({ w: img.width, h: img.height });
      setZoom(1);
      setOffset({ x: (VIEW - img.width * s) / 2, y: (VIEW - img.height * s) / 2 });
    };
    img.src = src;
  }, [open, src]);

  // Drag to pan.
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.px);
    const ny = drag.current.oy + (e.clientY - drag.current.py);
    setOffset(clampOffset(nx, ny));
  }
  function endDrag() {
    drag.current = null;
  }

  // Zoom about the window centre so the framing stays put.
  function onZoom(nextZoom: number) {
    const nextScale = baseScale * nextZoom;
    const cx = (VIEW / 2 - offset.x) / scale; // image-space point under the centre
    const cy = (VIEW / 2 - offset.y) / scale;
    const nx = VIEW / 2 - cx * nextScale;
    const ny = VIEW / 2 - cy * nextScale;
    const nDispW = dims ? dims.w * nextScale : 0;
    const nDispH = dims ? dims.h * nextScale : 0;
    setZoom(nextZoom);
    setOffset({
      x: clamp(nx, VIEW - nDispW, 0),
      y: clamp(ny, VIEW - nDispH, 0),
    });
  }

  function handleSave() {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sSize = VIEW / scale;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUT, OUT);
    onSave(canvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <Modal open={open} onClose={onCancel} title="Adjust photo">
      <div className="flex flex-col items-center gap-4">
        <p className="text-xs text-gray-500">Drag to reposition · use the slider to zoom.</p>

        {/* Crop window */}
        <div
          className="relative touch-none overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-inner"
          style={{ width: VIEW, height: VIEW, cursor: "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {dims && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt="Adjust"
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
              style={{
                width: dispW,
                height: dispH,
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
              }}
            />
          )}
          {/* Framing hint */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
        </div>

        {/* Zoom control */}
        <div className="flex w-full max-w-[260px] items-center gap-3">
          <span className="text-xs font-semibold text-gray-400">–</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-red-600"
          />
          <span className="text-xs font-semibold text-gray-400">+</span>
        </div>

        <div className="flex w-full justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!dims}>
            Save photo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
