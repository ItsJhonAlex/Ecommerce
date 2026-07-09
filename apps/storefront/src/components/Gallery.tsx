import { useState } from "react";

interface GalleryImage {
  url: string;
  alt: string | null;
}

interface Props {
  images: GalleryImage[];
  /** Nombre del producto: fallback de `alt` y base del placeholder. */
  name: string;
}

/**
 * Isla: galería del detalle. Imagen principal (según el índice seleccionado) +
 * tira de thumbnails clickeables. Sin imágenes → placeholder con la inicial.
 * En móvil la imagen grande queda arriba y los thumbnails debajo.
 */
export default function Gallery({ images, name }: Props) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    const initial = name.trim().charAt(0).toUpperCase() || "•";
    return (
      <div
        className="grid aspect-square w-full place-items-center rounded-lg bg-brand-50 text-brand-300"
        aria-hidden="true"
      >
        <span className="text-6xl font-extrabold tracking-tight">{initial}</span>
      </div>
    );
  }

  const current = images[Math.min(selected, images.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square w-full overflow-hidden rounded-lg border border-line bg-paper">
        <img
          src={current.url}
          alt={current.alt ?? name}
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <ul className="flex flex-wrap gap-2" aria-label="Miniaturas del producto">
          {images.map((image, index) => {
            const isActive = index === selected;
            return (
              <li key={`${image.url}-${index}`}>
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  aria-label={`Ver imagen ${index + 1} de ${images.length}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`h-16 w-16 overflow-hidden rounded-md border-2 transition-colors ${
                    isActive
                      ? "border-brand-500"
                      : "border-line hover:border-brand-300"
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.alt ?? `${name} — miniatura ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
