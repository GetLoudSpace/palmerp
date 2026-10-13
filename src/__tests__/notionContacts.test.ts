import { describe, it, expect } from "vitest";
import { mapNotionStudent, mapNotionInstrument, isBajaEstado } from "../config/notionContacts";

// Fixture SINTÉTICA con la forma exacta de "Alumnos (Administrativa)".
// Nunca datos reales de Notion.
function page(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    properties: {
      Alumno: { type: "title", title: [{ plain_text: "Nombre Ejemplo" }] },
      Phone: { type: "phone_number", phone_number: "+34600111222" },
      Email: { type: "email", email: "ejemplo@mail.es" },
      "Padre/Madre/Tutor": { type: "rich_text", rich_text: [{ plain_text: "Madre Ejemplo" }] },
      Edad: { type: "number", number: 12 },
      Instrumento: { type: "multi_select", multi_select: [{ name: "Batería" }, { name: "Canto" }] },
      Ciudad: { type: "select", select: { name: "Ripollet" } },
      "Dirección": { type: "rich_text", rich_text: [{ plain_text: "Calle Ejemplo 1" }] },
      "Fecha inicio": { type: "date", date: { start: "2026-09-25" } },
      "Día": { type: "multi_select", multi_select: [{ name: "Jueves" }] },
      "Hora (individual)": { type: "rich_text", rich_text: [{ plain_text: "17:30-18:30" }] },
      "Fecha baja": { type: "date", date: null },
      "Estado de pagos": { type: "status", status: { name: "✅Al corriente" } },
      ...overrides,
    },
  };
}

describe("notionContacts — feature #10", () => {
  it("mapea un menor con tutor e instrumentos", () => {
    const m = mapNotionStudent(page() as never);
    expect(m.skipReason).toBeNull();
    expect(m.name).toBe("Nombre Ejemplo");
    expect(m.phone).toBe("+34600111222");
    expect(m.tutorName).toBe("Madre Ejemplo");
    expect(m.isMinor).toBe(true);
    expect(m.instrumentsDb).toEqual(["BATERIA", "VOZ"]);
    expect(m.primaryInstrumentDb).toBe("BATERIA");
    expect(m.billingCity).toBe("Ripollet");
    expect(m.enrollmentDate).toBe("2026-09-25");
  });

  it("marca baja por fecha o por estado", () => {
    const porFecha = mapNotionStudent(
      page({ "Fecha baja": { type: "date", date: { start: "2026-07-01" } } }) as never,
    );
    expect(porFecha.skipReason).toBe("baja");
    const porEstado = mapNotionStudent(
      page({ "Estado de pagos": { type: "status", status: { name: "🚫 Baja definitiva" } } }) as never,
    );
    expect(porEstado.skipReason).toBe("baja");
    expect(isBajaEstado("⏸️ Congelado / Baja temporal")).toBe(true);
    expect(isBajaEstado("✅Al corriente")).toBe(false);
  });

  it("descarta sin teléfono o sin nombre", () => {
    expect(mapNotionStudent(page({ Phone: { type: "phone_number", phone_number: null } }) as never).skipReason).toBe(
      "sin-telefono",
    );
    expect(mapNotionStudent(page({ Alumno: { type: "title", title: [] } }) as never).skipReason).toBe("sin-nombre");
  });

  it("adulto sin tutor ni edad no es menor y no se descarta", () => {
    const m = mapNotionStudent(
      page({ Edad: { type: "number", number: null }, "Padre/Madre/Tutor": { type: "rich_text", rich_text: [] } }) as never,
    );
    expect(m.skipReason).toBeNull();
    expect(m.isMinor).toBe(false);
    expect(m.tutorName).toBe("");
  });

  it("mapea las 6 opciones de instrumento y rechaza desconocidas", () => {
    expect(mapNotionInstrument("Guitarra Ac.")).toBe("GUITARRA_ACUSTICA");
    expect(mapNotionInstrument("Guitarra E.")).toBe("GUITARRA_ELECTRICA");
    expect(mapNotionInstrument("Batería")).toBe("BATERIA");
    expect(mapNotionInstrument("Violín")).toBeNull();
  });
});
