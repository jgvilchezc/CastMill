import { describe, it, expect, vi, beforeEach } from "vitest";

const createCompletion = vi.fn();

vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: createCompletion } };
  },
}));

import { generateTitle, fallbackTitle } from "./title";

beforeEach(() => {
  createCompletion.mockReset();
  process.env.GROQ_API_KEY = "test-key";
});

describe("fallbackTitle", () => {
  it("takes the first words and caps length", () => {
    expect(fallbackTitle("hola mundo esto es una prueba larga de mas palabras"))
      .toBe("hola mundo esto es una prueba");
  });

  it("returns a default for empty text", () => {
    expect(fallbackTitle("   ")).toBe("Transcripción");
  });
});

describe("generateTitle", () => {
  it("returns the trimmed model title", async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: '  Reunión de ventas  ' } }],
    });
    const title = await generateTitle("hablamos de la estrategia de ventas q1");
    expect(title).toBe("Reunión de ventas");
  });

  it("falls back to heuristic when the model errors", async () => {
    createCompletion.mockRejectedValue(new Error("groq down"));
    const title = await generateTitle("nota sobre el lanzamiento del producto nuevo");
    expect(title).toBe("nota sobre el lanzamiento del producto");
  });

  it("falls back when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const title = await generateTitle("texto de prueba sin clave de api configurada");
    expect(createCompletion).not.toHaveBeenCalled();
    expect(title).toBe("texto de prueba sin clave de");
  });

  it("strips surrounding quotes from the model output", async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: '"Plan de marketing"' } }],
    });
    expect(await generateTitle("algo")).toBe("Plan de marketing");
  });
});
