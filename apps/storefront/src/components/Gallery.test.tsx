import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Gallery from "./Gallery.tsx";

const images = [
  { url: "https://cdn.test/rojo.jpg", alt: "Camiseta roja" },
  { url: "https://cdn.test/verde.jpg", alt: "Camiseta verde" },
  { url: "https://cdn.test/azul.jpg", alt: "Camiseta azul" },
];

// La imagen principal es el primer <img> del DOM (va antes de la tira de thumbnails).
const mainImage = () => screen.getAllByRole("img")[0] as HTMLImageElement;

describe("Gallery", () => {
  test("muestra la primera imagen como principal y una miniatura por imagen", () => {
    render(<Gallery images={images} name="Camiseta" />);

    expect(mainImage()).toHaveAttribute("src", images[0].url);
    // Un botón (miniatura clickeable) por cada imagen.
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  test("al clickear la 3ra miniatura, la imagen principal cambia a la 3ra", () => {
    render(<Gallery images={images} name="Camiseta" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Ver imagen 3 de 3" }),
    );

    expect(mainImage()).toHaveAttribute("src", images[2].url);
    expect(mainImage()).toHaveAttribute("alt", images[2].alt);
  });

  test("sin imágenes muestra un placeholder (sin <img>)", () => {
    render(<Gallery images={[]} name="Camiseta" />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
