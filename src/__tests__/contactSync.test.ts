import { describe, it, expect } from "vitest";
import {
  mapInstrumentToDb,
  mapInstrumentFromDb,
  validateContactPayload,
  contactDedupeKey,
  splitPhone,
  buildReviewMessage,
  buildReviewWaMeUrl,
  GOOGLE_REVIEW_URL,
} from "../lib/contactSync";

describe("contactSync — feature #11 contacts_shared_db", () => {
  it("mapea GUITARRA (UI) al enum DB y viceversa", () => {
    expect(mapInstrumentToDb("GUITARRA")).toBe("GUITARRA_ACUSTICA");
    expect(mapInstrumentToDb("guitarra")).toBe("GUITARRA_ACUSTICA");
    expect(mapInstrumentToDb("PIANO")).toBe("PIANO");
    expect(mapInstrumentToDb("GUITARRA_ELECTRICA")).toBe("GUITARRA_ELECTRICA");
    expect(mapInstrumentToDb("VIOLIN")).toBeUndefined();
    expect(mapInstrumentToDb("")).toBeUndefined();
    expect(mapInstrumentFromDb("GUITARRA_ACUSTICA")).toBe("GUITARRA");
    expect(mapInstrumentFromDb("GUITARRA_ELECTRICA")).toBe("GUITARRA");
    expect(mapInstrumentFromDb("PIANO")).toBe("PIANO");
  });

  it("valida nombre requerido e instrumento obligatorio en ALUMNO", () => {
    expect(validateContactPayload({}).ok).toBe(false);
    const sinInstrumento = validateContactPayload({ name: "Ana", category: "ALUMNO" });
    expect(sinInstrumento.ok).toBe(false);
    const ok = validateContactPayload({ name: "Ana", category: "ALUMNO", instrument: "GUITARRA" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.instrument).toBe("GUITARRA_ACUSTICA");
  });

  it("rechaza email con formato inválido y normaliza a minúsculas", () => {
    expect(validateContactPayload({ name: "A", email: "no-es-email" }).ok).toBe(false);
    const r = validateContactPayload({ name: "A", email: "  Ana@Mail.ES " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.email).toBe("ana@mail.es");
  });

  it("dedupe prioriza teléfono > email > nombre", () => {
    expect(contactDedupeKey({ phone: "600 111 222", email: "a@x.es", name: "Ana" })).toBe("phone:34600111222");
    expect(contactDedupeKey({ email: "A@x.es", name: "Ana" })).toBe("email:a@x.es");
    expect(contactDedupeKey({ name: "  Ana Ruiz " })).toBe("name:ana ruiz");
    // mismo móvil con distinto formato → misma clave (idempotencia del import)
    expect(contactDedupeKey({ phone: "+34 600111222" })).toBe(contactDedupeKey({ phone: "600111222" }));
  });

  it("splitPhone normaliza ES anteponiendo 34", () => {
    expect(splitPhone("600111222")).toEqual({ phone: "600111222", phoneNormalized: "34600111222" });
    expect(splitPhone("")).toEqual({ phone: "", phoneNormalized: null });
  });

  it("mensaje de reseña con nombre de pila + enlace (feature #14)", () => {
    const msg = buildReviewMessage("Ana Ruiz Gil");
    expect(msg).toContain("¡Hola, Ana!");
    expect(msg).toContain("reseña de Google");
    expect(msg).toContain("Get Loud");
    expect(msg).toContain(GOOGLE_REVIEW_URL);
    expect(buildReviewWaMeUrl("600111222", "Ana Ruiz")).toContain("https://wa.me/34600111222?text=");
    expect(buildReviewWaMeUrl("", "Ana")).toBe("");
  });
});
