import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "Tenant Slug", type: "text" },
        bypassToken: { label: "Bypass Token", type: "text" },
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials) return null;

        // --- Instancia independiente: solo su tenant (ver src/lib/tenant.ts) ---
        const pinned = (process.env.PINNED_TENANT_SLUG || "").trim().toLowerCase();
        if (pinned && (credentials.tenantSlug || "").trim().toLowerCase() !== pinned) {
          return null;
        }

        // --- Superadmin Bypass Logic (token efímero de 60s) ---
        if (credentials.bypassToken && credentials.userId && credentials.tenantSlug) {
          try {
            const tenant = await db.tenant.findUnique({
              where: { slug: credentials.tenantSlug },
            });

            if (tenant) {
              const tokenSetting = await db.setting.findUnique({
                where: { tenantId_key: { tenantId: tenant.id, key: "superadmin_access_token" } },
              });

              if (tokenSetting && tokenSetting.value === credentials.bypassToken) {
                const user = await db.user.findUnique({
                  where: { id: credentials.userId },
                });

                if (user) {
                  return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    tenantId: user.tenantId,
                    tenantSlug: tenant.slug,
                  };
                }
              }
            }
          } catch (error) {
            console.error("[Auth Bypass] error:", (error as Error).message);
          }
        }

        if (!credentials.email || !credentials.password || !credentials.tenantSlug) {
          return null;
        }

        try {


          // 1. Find the tenant by slug
          const tenant = await db.tenant.findUnique({
            where: { slug: credentials.tenantSlug },
          });

          if (!tenant || !tenant.isActive) {
            return null;
          }

          // 2. Find the user within this specific tenant
          const user = await db.user.findUnique({
            where: {
              tenantId_email: {
                tenantId: tenant.id,
                email: credentials.email,
              },
            },
          });

          if (!user) {
            return null;
          }

          // 3. Verify the password
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

          if (!isValid) {
            return null;
          }

          // 4. Return the user object for the session
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            tenantSlug: tenant.slug,
          };
        } catch (error) {
          console.warn("Database connection failed in NextAuth authorize, falling back to mock database:", (error as Error).message);

          try {
            const { getMockTenants } = await import("./mockDb");
            const tenants = getMockTenants();
            
            const tenantSlug = credentials.tenantSlug.toLowerCase();
            const tenant = tenants.find((t: any) => t.slug.toLowerCase() === tenantSlug);
            
            if (!tenant || !tenant.isActive) {
              return null;
            }
            
            const user = tenant.users.find(
              (u: any) => u.email.toLowerCase() === credentials.email.toLowerCase()
            );
            
            if (!user) {
              return null;
            }
            
            // Validate password against plain text mock password or hashed password
            const isPasswordValid = 
              user.password === credentials.password || 
              (user.passwordHash && await bcrypt.compare(credentials.password, user.passwordHash));
              
            if (!isPasswordValid) {
              return null;
            }
            
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              tenantId: tenant.id,
              tenantSlug: tenant.slug,
            };
          } catch (mockErr) {
            console.error("Mock database authentication failed:", mockErr);
            return null;
          }
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          tenantId: token.tenantId as string,
          tenantSlug: token.tenantSlug as string,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// RBAC helper functions
export function hasRole(user: { role: string }, role: string): boolean {
  return user.role === role;
}

export function requireRole(role: string) {
  return async (req: any, ctx: any) => {
    // TODO: retrieve session using NextAuth getServerSession
    const session: any = null; // placeholder
    if (!session?.user || !hasRole(session.user, role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
    return ctx.next();
  };
}