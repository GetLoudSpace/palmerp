import fs from "fs";
import path from "path";

const MOCK_DB_PATH = path.join(process.cwd(), "src/lib/mock_db.json");

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  password?: string;
  passwordHash?: string;
}

export interface MockTenant {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  isActive: boolean;
  createdAt: string;
  users: MockUser[];
}

const DEFAULT_TENANTS: MockTenant[] = [
  {
    id: "t1",
    slug: "gastroshows",
    name: "Gastroshows S.L.",
    domain: "gastroshows.es",
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    users: [
      { id: "u2", name: "Renato García", email: "admin@gastroshows.es", role: "ADMIN", createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), password: "gastroshows123" },
      { id: "u2b", name: "Tech Admin", email: "tech@gastroshows.es", role: "ADMIN", createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), password: "G4STR0SH0WSb4rc3l0n42018" },
      { id: "u3", name: "Silvia Fernández", email: "silvia@gastroshows.es", role: "USUARIO", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), password: "gastroshows123" },
    ],
  },
  {
    id: "t2",
    slug: "sport2live",
    name: "Sport2Live Club",
    domain: "sport2live.com",
    isActive: true,
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    users: [
      { id: "u4", name: "Alex Ruiz", email: "alex@sport2live.com", role: "ADMIN", createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), password: "sport2live123" },
    ],
  },
  {
    id: "t3",
    slug: "delish-catering",
    name: "Delish Catering",
    domain: null,
    isActive: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    users: [
      { id: "u5", name: "María López", email: "maria@delish.com", role: "ADMIN", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), password: "maria123" },
    ],
  },
];

// En Vercel el filesystem es read-only (excepto /tmp) — no intentar escribir mock_db.json en producción
const IS_VERCEL = !!process.env.VERCEL;
let memoryTenants: MockTenant[] | null = null;

export function getMockTenants(): MockTenant[] {
  if (IS_VERCEL && memoryTenants) return memoryTenants;
  try {
    if (fs.existsSync(MOCK_DB_PATH)) {
      const fileData = fs.readFileSync(MOCK_DB_PATH, "utf-8");
      const parsed = JSON.parse(fileData) as MockTenant[];
      if (IS_VERCEL) memoryTenants = parsed;
      return parsed;
    }
  } catch (error) {
    console.error("Failed to read mock database file, using defaults:", error);
  }

  // If file doesn't exist or failed to load, write default and return
  if (!IS_VERCEL) {
    try {
      fs.mkdirSync(path.dirname(MOCK_DB_PATH), { recursive: true });
      fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(DEFAULT_TENANTS, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to write default mock database file:", error);
    }
  } else {
    memoryTenants = DEFAULT_TENANTS;
  }

  return DEFAULT_TENANTS;
}

export function saveMockTenants(tenants: MockTenant[]): boolean {
  if (IS_VERCEL) {
    memoryTenants = tenants;
    return true;
  }
  try {
    fs.mkdirSync(path.dirname(MOCK_DB_PATH), { recursive: true });
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(tenants, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to save mock database file:", error);
    return false;
  }
}