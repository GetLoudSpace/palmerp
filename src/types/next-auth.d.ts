import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      workRoles: string[];
      extraModules: string[];
      isActive: boolean;
      tenantId: string;
      tenantSlug: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    workRoles?: string[];
    extraModules?: string[];
    isActive?: boolean;
    tenantId: string;
    tenantSlug: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    workRoles?: string[];
    extraModules?: string[];
    isActive?: boolean;
    tenantId: string;
    tenantSlug: string;
  }
}
