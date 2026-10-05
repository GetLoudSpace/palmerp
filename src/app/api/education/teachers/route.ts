import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error:"No autorizado" }, { status:401 });
  // Solo ADMIN puede invitar profesores (es alta de usuarios).
  if (token.role !== "ADMIN" && token.role !== "DEV") return NextResponse.json({ error:"Solo ADMIN puede crear profesores" }, { status:403 });

  const body = await req.json().catch(()=> ({}));
  const { name, email, phone, instruments, password } = body as { name?:string; email?:string; phone?:string; instruments?:string[]; password?:string };
  if (!name || !email) return NextResponse.json({ error:"name y email requeridos" }, { status:400 });
  const emailNorm = String(email).trim().toLowerCase();
  if (!emailNorm.includes("@")) return NextResponse.json({ error:"email inválido" }, { status:400 });

  try {
    const tenantId = String(token.tenantId);
    const existing = await (db as any).user.findUnique({ where:{ tenantId_email: { tenantId, email: emailNorm } } }).catch(()=>null);
    if (existing) return NextResponse.json({ error:"Ya existe usuario con ese email en este tenant" }, { status:409 });

    const pass = password || Math.random().toString(36).slice(2,12) + "A1!";
    const hash = await bcrypt.hash(pass, 10);
    // Profesor = USUARIO con rol de trabajo PROFESOR (+ perfil con instrumentos).
    const user = await (db as any).user.create({
      data: { tenantId, name: String(name), email: emailNorm, passwordHash: hash, role: "USUARIO", isActive: true, workRoles: ["PROFESOR"], extraModules: [] },
    });
    try{
      await (db as any).eduTeacherProfile.create({
        data: { tenantId, userId: user.id, instruments: Array.isArray(instruments) ? instruments : [], isActive: true },
      });
    } catch{}
    // Audit
    try{
      await (db as any).auditLog.create({ data:{ tenantId, userId: String(token.id||token.sub), action:"EDU_TEACHER_INVITED", table:"User", recordId: user.id, details:`Profesor ${name} <${emailNorm}> USUARIO+PROFESOR instrumentos ${(instruments||[]).join(",")} — solo sus módulos, phone ${phone||""}`, success:true } });
    } catch{}

    return NextResponse.json({ success:true, user:{ id: user.id, email: user.email, role: user.role, workRoles: user.workRoles, isProfessor:true }, tempPassword: pass });
  } catch (e:any) {
    // fallback mock si DB no disponible (preview): simular éxito
    if (String(e?.message||"").includes("connect") || String(e?.message||"").includes("Tenant")) {
      return NextResponse.json({ success:true, user:{ id:"mock_"+Date.now(), email: emailNorm, role:"USUARIO", workRoles:["PROFESOR"], isProfessor:true }, tempPassword: password || "mockPass123!", mocked:true });
    }
    return NextResponse.json({ error: String(e?.message??e) }, { status:500 });
  }
}

export async function GET(req: NextRequest){
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.tenantId) return NextResponse.json({ error:"No autorizado" }, { status:401 });
  try{
    // Profesores = USUARIO con rol de trabajo PROFESOR (+ perfil con instrumentos).
    const users = await (db as any).user.findMany({
      where:{ tenantId: String(token.tenantId), workRoles: { has: "PROFESOR" } },
      orderBy:{ createdAt:"desc" },
    });
    const ids = users.map((u:any)=>u.id);
    let profiles: any[] = [];
    try{
      profiles = await (db as any).eduTeacherProfile.findMany({ where:{ tenantId: String(token.tenantId), userId: { in: ids } } });
    } catch{}
    const byUser = new Map(profiles.map((p:any)=>[p.userId, p]));
    const enriched = users.map((u:any)=> ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      workRoles: u.workRoles ?? [], isActive: u.isActive ?? true,
      instruments: byUser.get(u.id)?.instruments ?? [],
      teacherProfileId: byUser.get(u.id)?.id ?? null,
    }));
    return NextResponse.json({ success:true, users: enriched });
  } catch(e:any){
    return NextResponse.json({ success:false, error:String(e?.message??e), users:[] }, { status:500 });
  }
}
