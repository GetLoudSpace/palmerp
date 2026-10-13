import { describe, it, expect } from "vitest";
import { getReportRecipients, sendableRecipients } from "../modules/education/lib/recipients";

describe("recipients — fallback a alumno si el tutor no es enviable", () => {
  const student = { id: "s1", name: "Alumno Ejemplo", phone: "600111222" };

  it("TUTOR_ONLY con tutor sin teléfono envía al alumno (no se pierde)", () => {
    const recs = getReportRecipients({
      student,
      tutor: { id: "t1", name: "Tutor Ejemplo", phone: "" },
      commsMode: "TUTOR_ONLY",
    });
    const send = sendableRecipients(recs);
    expect(send).toHaveLength(1);
    expect(send[0].contactId).toBe("s1");
    expect(send[0].label).toContain("tutor sin teléfono");
  });

  it("TUTOR_ONLY con tutor con teléfono envía al tutor", () => {
    const recs = getReportRecipients({
      student,
      tutor: { id: "t1", name: "Tutor Ejemplo", phone: "611222333" },
      commsMode: "TUTOR_ONLY",
    });
    expect(sendableRecipients(recs).map((r) => r.contactId)).toEqual(["t1"]);
  });

  it("TUTOR_ONLY con tutor con opt-out envía al alumno", () => {
    const recs = getReportRecipients({
      student,
      tutor: { id: "t1", name: "Tutor Ejemplo", phone: "611222333", commsOptOut: true },
      commsMode: "TUTOR_ONLY",
    });
    expect(sendableRecipients(recs).map((r) => r.contactId)).toEqual(["s1"]);
  });
});
