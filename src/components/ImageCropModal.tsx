import { useEffect, useMemo, useRef, useState } from "react";
import {
  clampOffset,
  DEFAULT_CROP,
  drawCrop,
  exportAvatar,
  loadImageFile,
  type CropTransform,
} from "../lib/image";
import { Modal, Spinner } from "./ui";
import { Icon } from "./Icon";

interface ImageCropModalProps {
  file: File;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
  busy?: boolean;
}

/** Frame size in CSS pixels — preview and export use the same framing. */
const FRAME = 288;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function ImageCropModal({ file, onCancel, onApply, busy = false }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<CropTransform>(DEFAULT_CROP);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadImageFile(file)
      .then((loaded) => {
        if (!cancelled) setImage(loaded);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not read that image.");
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.width = FRAME;
    try {
      drawCrop(canvas, image, transform, FRAME);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not show that image.");
    }
  }, [image, transform]);

  const zoomPercent = useMemo(() => Math.round(transform.zoom * 100), [transform.zoom]);

  function update(next: Partial<CropTransform>) {
    setTransform((current) => {
      const merged = { ...current, ...next };
      return image ? { ...merged, ...clampOffset(image, merged, FRAME) } : merged;
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!image) return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const start = dragRef.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    dragRef.current = { x: event.clientX, y: event.clientY };
    setTransform((current) => {
      const merged = { ...current, offsetX: current.offsetX + dx, offsetY: current.offsetY + dy };
      return image ? { ...merged, ...clampOffset(image, merged, FRAME) } : merged;
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function applyCrop() {
    if (!image) return;
    try {
      onApply(exportAvatar(image, transform, FRAME));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that photo.");
    }
  }

  return (
    <Modal
      title="Adjust your photo"
      subtitle="Drag to move, zoom to fill the circle, then use the photo."
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={applyCrop} disabled={!image || busy}>
            <Icon name="check" size={16} />
            {busy ? "Saving…" : "Use this photo"}
          </button>
        </>
      }
    >
      <div className="crop-stack">
        {!image && !error ? <Spinner label="Opening your photo" /> : null}

        <div className={`crop-frame ${dragging ? "is-dragging" : ""}`} style={{ width: FRAME, height: FRAME }}>
          <canvas
            ref={canvasRef}
            className="crop-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={(event) => {
              event.preventDefault();
              update({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, transform.zoom - event.deltaY * 0.0015)) });
            }}
          />
          <span className="crop-ring" aria-hidden="true" />
        </div>

        <div className="crop-controls">
          <label className="crop-zoom">
            <Icon name="search" size={15} />
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={transform.zoom}
              onChange={(event) => update({ zoom: Number(event.target.value) })}
              aria-label="Zoom"
              disabled={!image}
            />
            <span className="crop-zoom-value">{zoomPercent}%</span>
          </label>

          <div className="button-row">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => update({ rotation: transform.rotation + 1 })}
              disabled={!image}
            >
              <Icon name="refresh" size={15} /> Rotate
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setTransform(DEFAULT_CROP)}
              disabled={!image}
            >
              <Icon name="close" size={15} /> Reset
            </button>
          </div>
        </div>

        <p className="muted small">
          The circle shows how your photo looks on your profile. Everything outside it is cropped away.
        </p>

        {error ? (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" size={17} />
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
