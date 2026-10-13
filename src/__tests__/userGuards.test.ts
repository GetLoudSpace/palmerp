import { describe, it, expect } from "vitest";
import { canEditUser, canDeleteUser, normalizeLoginEmail } from "../lib/userGuards";

const ADMIN = { id: "a1", role: "ADMIN" };
const DEV = { id: "d1", role: "DEV" };
const USER = { id: "u1", role: "USUARIO" };

describe("userGuards — feature #12", () => {
  it("ADMIN edita a cualquiera salvo DEV; DEV edita a DEV", () => {
    expect(canEditUser(ADMIN, { id: "x", role: "USUARIO" })).toBe(true);
    expect(canEditUser(ADMIN, { id: "x", role: "ADMIN" })).toBe(true);
    expect(canEditUser(ADMIN, { id: "x", role: "DEV" })).toBe(false);
    expect(canEditUser(DEV, { id: "x", role: "DEV" })).toBe(true);
    expect(canEditUser(USER, { id: "x", role: "USUARIO" })).toBe(false);
  });

  it("borrar exige editar + no ser uno mismo", () => {
    expect(canDeleteUser(ADMIN, { id: "x", role: "USUARIO" })).toBe(true);
    expect(canDeleteUser(ADMIN, { id: "a1", role: "ADMIN" })).toBe(false);
    expect(canDeleteUser(ADMIN, { id: "x", role: "DEV" })).toBe(false);
    expect(canDeleteUser(DEV, { id: "x", role: "DEV" })).toBe(true);
    expect(canDeleteUser(USER, { id: "x", role: "USUARIO" })).toBe(false);
  });

  it("normaliza y valida emails de login", () => {
    expect(normalizeLoginEmail("  Ana@Mail.ES ")).toBe("ana@mail.es");
    expect(normalizeLoginEmail("no-es-email")).toBeNull();
    expect(normalizeLoginEmail("")).toBeNull();
    expect(normalizeLoginEmail(undefined)).toBeNull();
  });
});
