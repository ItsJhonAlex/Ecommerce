import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { handlers } from "./handlers";

// jsdom no implementa URL.createObjectURL/revokeObjectURL; <ReceiptPreview> las
// usa para embeber el PDF. Stub mínimo para que los tests no revienten.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:preview";
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = () => {};
}

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
