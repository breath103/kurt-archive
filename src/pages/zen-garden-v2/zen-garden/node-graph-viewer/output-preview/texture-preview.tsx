import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type * as THREE from "three";

type Props = {
  value: THREE.Texture;
  renderer: THREE.WebGLRenderer;
};

export function TexturePreview({ value, renderer }: Props) {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const imageSrc = useMemo(() => {
    const img = value.image;

    if (img instanceof HTMLImageElement) {
      return img.src;
    }
    if (img instanceof HTMLCanvasElement || img instanceof ImageBitmap) {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      return canvas.toDataURL();
    }

    const rt = value.renderTarget;
    if (rt) {
      const width = rt.width;
      const height = rt.height;
      const pixels = new Uint8Array(width * height * 4);
      renderer.readRenderTargetPixels(rt as THREE.WebGLRenderTarget, 0, 0, width, height, pixels);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);

      const flipped = document.createElement("canvas");
      flipped.width = width;
      flipped.height = height;
      const fctx = flipped.getContext("2d")!;
      fctx.translate(0, height);
      fctx.scale(1, -1);
      fctx.drawImage(canvas, 0, 0);

      return flipped.toDataURL();
    }

    return null;
  }, [value, renderer]);

  useEffect(() => {
    if (!div || !imageSrc) return;
    div.innerHTML = "";
    const img = document.createElement("img");
    img.src = imageSrc;
    img.style.width = "150px";
    img.style.height = "150px";
    img.style.objectFit = "contain";
    div.appendChild(img);
  }, [div, imageSrc]);

  return (
    <>
      <div
        ref={setDiv}
        className="w-[150px] h-[150px] border border-gray-600 bg-gray-800 cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {hovered && imageSrc && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 pointer-events-none">
          <img src={imageSrc} className="max-w-[90vw] max-h-[90vh] object-contain" />
        </div>,
        document.body
      )}
    </>
  );
}
