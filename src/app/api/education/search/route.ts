import { NextRequest, NextResponse } from "next/server";
import { getTenantIdFromHeaders } from "@/lib/tenant";
import db from "@/lib/db";
import { buildBraveQuery, buildSearchQueryHash, NORMALIZER_SYSTEM_PROMPT, SearchQuery } from "@/modules/education/lib/search";

// POST /api/education/search { instrument, level, skill, text, durationMax }
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(()=>({}))) as SearchQuery;
    const tenantId = (await getTenantIdFromHeaders()) || "demo";
    const qHash = buildSearchQueryHash(tenantId, body);
    // check cache 24h
    try {
      const cached = await (db as any).eduExerciseSearchCache?.findUnique?.({ where:{ tenantId_queryHash: { tenantId, queryHash: qHash } } });
      if (cached && Date.now() - new Date(cached.createdAt).getTime() < 24*3600*1000) {
        return NextResponse.json({ success:true, cached:true, results: cached.results, hash: qHash });
      }
    } catch {}

    const braveQuery = buildBraveQuery(body);
    const braveKey = process.env.BRAVE_SEARCH_API_KEY || process.env.SEARCH_API_KEY || null;

    let braveResults: any[] = [];
    if (braveKey) {
      try {
        const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(braveQuery)}&count=20`, { headers: { "X-Subscription-Token": braveKey, Accept:"application/json" } });
        const data = await res.json().catch(()=>null);
        braveResults = (data?.web?.results || []).slice(0,20).map((r:any)=>({ title:r.title, url:r.url, snippet:r.description, thumbnail:r.thumbnail?.src }));
      } catch {}
    }
    // fallback mock if no key or no results
    if (braveResults.length===0) {
      braveResults = Array.from({length:20}, (_,i)=>({ title: `${body.text||"Ejercicio"} ${i+1} · ${body.instrument||"GUITARRA"}`, url:`https://example.com/exercise-${i+1}`, snippet: `Resultado ${i+1} snippet Brave mock — tablatura y dificultad.`, thumbnail: null }));
    }

    // LLM normalize — try OpenRouter if key exists, else deterministic mock normalizer same structure
    const openRouterKey = process.env.OPENROUTER_API_KEY || null;
    let normalized: any[] = [];
    if (openRouterKey && braveResults.length) {
      try {
        const prompt = `${NORMALIZER_SYSTEM_PROMPT}\nFuentes:\n${JSON.stringify(braveResults.slice(0,10))}\nDevuelve JSON array con 10 objetos.`;
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method:"POST",
          headers:{ Authorization:`Bearer ${openRouterKey}`, "Content-Type":"application/json" },
          body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini", messages:[{role:"user", content: prompt}] }),
        });
        const data: any = await res.json().catch(()=>null);
        const text = data?.choices?.[0]?.message?.content || "";
        const m = text.match(/\[[\s\S]*\]/);
        if (m) normalized = JSON.parse(m[0]);
      } catch {}
    }
    if (normalized.length===0) {
      normalized = braveResults.map((r,i)=>({
        title: r.title?.slice(0,60) || `Ejercicio ${i+1}`,
        instrument: body.instrument || "GUITARRA",
        level: body.level || "BASICO",
        difficulty: (i%5)+1,
        estimatedMin: [5,10,15,10,5,20][i%6],
        skillKeys: body.skill? [body.skill] : [["acordes_abiertos"],["cejilla"],["ritmo_4_4"],["escala_pent"]][i%4] as string[],
        description: r.snippet?.slice(0,220) || "Ejercicio web normalizado misma estructura.",
        tabContent: `e|-${i}--${i+1}--|\nB|-${i+1}--|`,
        sourceUrl: r.url,
        sourceType: (["VIDEO","BLOG","TAB","IMAGE"] as const)[i%4],
      }));
    }

    // cache
    try {
      await (db as any).eduExerciseSearchCache?.upsert?.({
        where:{ tenantId_queryHash:{ tenantId, queryHash: qHash } },
        create:{ tenantId, queryHash: qHash, query: body as any, results: normalized as any },
        update:{ results: normalized as any, query: body as any },
      });
    } catch {}

    return NextResponse.json({ success:true, cached:false, results: normalized, hash: qHash, braveQuery });
  } catch (e:any) {
    return NextResponse.json({ success:false, error: String(e?.message ?? e) }, { status:500 });
  }
}
