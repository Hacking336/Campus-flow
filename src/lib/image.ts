const MAX_BYTES = 8 * 1024 * 1024;
export const AVATAR_SIZE = 320;

export interface CropTransform {
  /** Quarter turns clockwise: 0, 1, 2 or 3. */
  rotation: number;
  /** Zoom on top of the "fill the frame" scale, 1 = fit. */
  zoom: number;
  /** Pan in viewport pixels. */
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_CROP: CropTransform = { rotation: 0, zoom: 1, offsetX: 0, offsetY: 0 };

/** Read a chosen file into a decoded image we can draw on a canvas. */
export async function loadImageFile(file: File): Promise<HTMLImageElement> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file (PNG, JPG or WebP).");
  if (file.size > MAX_BYTES) throw new Error("That image is larger than 8 MB. Please choose a smaller one.");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("We could not read that image. Please try another file."));
    reader.readAsDataURL(file);
  });

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be opened. Please try another file."));
    image.src = dataUrl;
  });
}

/** Bounding box of the rotated image, in image pixels. */
export function rotatedSize(image: HTMLImageElement, rotation: number) {
  const quarter = ((rotation % 4) + 4) % 4;
  return quarter % 2 === 0
    ? { width: image.width, height: image.height }
    : { width: image.height, height: image.width };
}

/**
 * Scale that makes the rotated image cover the square frame at zoom 1.
 * Everything is expressed in frame pixels so preview and export always match.
 */
export function baseScale(image: HTMLImageElement, rotation: number, frame: number) {
  const { width, height } = rotatedSize(image, rotation);
  return Math.max(frame / width, frame / height);
}

/** Keep the frame fully covered by the image: panning can never show empty space. */
export function clampOffset(image: HTMLImageElement, transform: CropTransform, frame: number) {
  const { width, height } = rotatedSize(image, transform.rotation);
  const scale = baseScale(image, transform.rotation, frame) * transform.zoom;
  const maxX = Math.max(0, (width * scale - frame) / 2);
  const maxY = Math.max(0, (height * scale - frame) / 2);
  return {
    offsetX: Math.min(maxX, Math.max(-maxX, transform.offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, transform.offsetY)),
  };
}

/** Draw the image into a square canvas using the current crop transform. */
export function drawCrop(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  transform: CropTransform,
  frame: number
) {
  const size = canvas.width;
  const ratio = size / frame;
  const clamped = clampOffset(image, transform, frame);
  const scale = baseScale(image, transform.rotation, frame) * transform.zoom;

  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process that image.");

  context.save();
  context.clearRect(0, 0, size, size);
  // Plain background so transparent PNGs do not turn black when saved as JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.translate(size / 2 + clamped.offsetX * ratio, size / 2 + clamped.offsetY * ratio);
  context.rotate((transform.rotation * Math.PI) / 2);
  const drawWidth = image.width * scale * ratio;
  const drawHeight = image.height * scale * ratio;
  context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
}

/** Export the cropped photo as a small JPEG the API accepts. */
export function exportAvatar(image: HTMLImageElement, transform: CropTransform, frame: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  drawCrop(canvas, image, transform, frame);
  const output = canvas.toDataURL("image/jpeg", 0.86);
  if (output.length > 1_200_000) {
    throw new Error("That image is still too large after cropping. Please choose a simpler photo.");
  }
  return output;
}
