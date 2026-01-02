import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type * as THREE from "three";

type Props = {
  value: THREE.Texture;
  renderer: THREE.WebGLRenderer;
};

export function TexturePreview({ value, renderer }: Props) {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const [showFull, setShowFull] = useState(false);

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
      const { width, height } = rt;
      const pixels = new Uint8Array(width * height * 4);
      renderer.readRenderTargetPixels(rt as THREE.WebGLRenderTarget, 0, 0, width, height, pixels);

      // Flip Y in-place
      const rowSize = width * 4;
      const temp = new Uint8Array(rowSize);
      for (let y = 0; y < height / 2; y++) {
        const topOffset = y * rowSize;
        const bottomOffset = (height - 1 - y) * rowSize;
        temp.set(pixels.subarray(topOffset, topOffset + rowSize));
        pixels.copyWithin(topOffset, bottomOffset, bottomOffset + rowSize);
        pixels.set(temp, bottomOffset);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
      return canvas.toDataURL();
    }

    return null;
  }, [value, renderer]);

  useEffect(() => {
    if (!div || !imageSrc) return;
    div.innerHTML = "";
    const img = document.createElement("img");
    img.src = imageSrc;
    img.style.width = "w-full";
    img.style.height = "auto";
    div.appendChild(img);
  }, [div, imageSrc]);

  return (
    <>
      <div
        ref={setDiv}
        className="border border-gray-600 bg-gray-800 cursor-pointer"
        onClick={() => setShowFull (true)}
      />
      {showFull && imageSrc && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowFull (false)}>
          <img src={imageSrc} className="max-w-[90vw] max-h-[90vh] object-contain" />
        </div>,
        document.body
      )}
    </>
  );
}
