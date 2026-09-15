#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Guía Completa PalmerP — PDF visualmente limpio
13 capítulos, porqués + pasos bien divididos, usuario + técnico
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                HRFlowable, KeepTogether, PageBreak)
from reportlab.lib import colors
import os

OUT = "/Users/renatopaolo/palmerp/docs/Guia-Completa-PalmerP-Sistema.pdf"
W, H = A4

AMBER = HexColor("#D97706")
AMBER_DARK = HexColor("#92400E")
AMBER_LIGHT = HexColor("#FEF3C7")
GRAPHITE = HexColor("#1F2937")
GRAY = HexColor("#6B7280")
GRAY_LIGHT = HexColor("#F9FAFB")
TEAL = HexColor("#0F766E")
TEAL_LIGHT = HexColor("#CCFBF1")
GREEN = HexColor("#059669")
RED = HexColor("#DC2626")
BLUE = HexColor("#2563EB")
LIGHT_BLUE = HexColor("#EFF6FF")
ROSE_LIGHT = HexColor("#FEF2F2")

def hf(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(GRAPHITE)
    canvas.rect(0, H-13*mm, W, 13*mm, stroke=0, fill=1)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.drawString(14*mm, H-8.5*mm, "PALMERP  •  Guía Completa — Fleet + Triple Backup + Updates 1-Click")
    canvas.setFont("Helvetica", 6.5)
    canvas.drawRightString(W-14*mm, H-8.5*mm, "Visual • Pedagógica • Paso a paso  •  v1.1  —  15 Sep 2026")
    canvas.setFillColor(GRAY)
    canvas.setFont("Helvetica", 6)
    canvas.drawString(14*mm, 9*mm, "PalmerP ERP Core • Si pierdes la BACKUP_ENCRYPTION_KEY el .enc es irrecuperable")
    canvas.drawRightString(W-14*mm, 9*mm, f"Pág. {doc.page}")
    canvas.restoreState()

styles = getSampleStyleSheet()
sTitle = ParagraphStyle("Title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=26, leading=28, textColor=GRAPHITE, spaceAfter=2*mm)
sSub = ParagraphStyle("Sub", parent=styles["Normal"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=GRAY)
sH1 = ParagraphStyle("H1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=14, leading=17, textColor=GRAPHITE, spaceBefore=7*mm, spaceAfter=3*mm, keepWithNext=True)
sH2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=AMBER_DARK, spaceBefore=5*mm, spaceAfter=2*mm, keepWithNext=True)
sH3 = ParagraphStyle("H3", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=9, leading=11, textColor=GRAPHITE, spaceBefore=3*mm, spaceAfter=1.5*mm)
sBody = ParagraphStyle("Body", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=12, textColor=GRAPHITE, alignment=TA_JUSTIFY, spaceAfter=1.5*mm)
sBullet = ParagraphStyle("Bullet", parent=sBody, leftIndent=8*mm, bulletIndent=3*mm, spaceAfter=1.2*mm)
sCap = ParagraphStyle("Cap", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=6.5, leading=8, textColor=GRAY, alignment=TA_CENTER, spaceAfter=2*mm)
sCode = ParagraphStyle("Code", parent=styles["Code"], fontName="Helvetica", fontSize=6.8, leading=9, textColor=GRAPHITE, backColor=HexColor("#F3F4F6"), borderPadding=(3,3,5), spaceAfter=1.5*mm)
sCell = ParagraphStyle("Cell", parent=styles["Normal"], fontName="Helvetica", fontSize=7, leading=8.5, textColor=GRAPHITE)
sHead = ParagraphStyle("Head", parent=sCell, fontName="Helvetica-Bold", textColor=white, alignment=TA_CENTER, fontSize=6.5)
sBadge = ParagraphStyle("Badge", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=6.5, leading=7, textColor=white, alignment=TA_CENTER)
sKPI = ParagraphStyle("KPI", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=18, leading=18, textColor=GRAPHITE, alignment=TA_CENTER)
sKpiLab = ParagraphStyle("KpiLab", parent=styles["Normal"], fontName="Helvetica", fontSize=6, leading=7, textColor=GRAY, alignment=TA_CENTER)

def badge(txt, bg=GRAPHITE):
    t = Table([[Paragraph(txt, sBadge)]], colWidths=[38*mm])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),bg),("ROUNDEDCORNERS",[3,3,3,3]),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2),("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4)]))
    return t
def box(title, body, bg=AMBER_LIGHT, border=AMBER, icon="💡"):
    inner = [[Paragraph(f"<b>{icon} {title}</b>", ParagraphStyle("BTitle", parent=sBody, fontName="Helvetica-Bold", fontSize=8, textColor=GRAPHITE))],[Paragraph(body, sBody)]]
    t = Table(inner, colWidths=[176*mm])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),bg),("BOX",(0,0),(-1,-1),0.5,border),("ROUNDEDCORNERS",[3,3,3,3]),("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3)]))
    return t
def wbox(t,b): return box(t,b, bg=ROSE_LIGHT, border=RED, icon="⚠️")
def sbox(t,b): return box(t,b, bg=HexColor("#ECFDF5"), border=GREEN, icon="✅")
def gbox(t,b): return box(t,b, bg=TEAL_LIGHT, border=TEAL, icon="🔐")
def step(n, title, desc, cmd=None):
    ns = ParagraphStyle("N", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=11, textColor=white, alignment=TA_CENTER)
    circle = Table([[Paragraph(str(n), ns)]], colWidths=[9*mm], rowHeights=[9*mm])
    circle.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),AMBER),("ROUNDEDCORNERS",[4,4,4,4]),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
    content = [Paragraph(f"<b>{title}</b>", ParagraphStyle("ST", parent=sBody, fontName="Helvetica-Bold", fontSize=9, textColor=GRAPHITE, spaceAfter=1*mm)), Paragraph(desc, sBody)]
    if cmd: content.append(Paragraph(f'<font color="#1F2937"><b>$</b> {cmd}</font>', sCode))
    t = Table([[circle, content]], colWidths=[11*mm, 165*mm])
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),1),("RIGHTPADDING",(0,0),(-1,-1),1),("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),3)]))
    return t

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=14*mm, rightMargin=14*mm, topMargin=17*mm, bottomMargin=12*mm, title="Guía Completa PalmerP", author="PalmerP")
story = []

# COVER
story.append(Spacer(1, 8*mm))
story.append(badge("GUÍA COMPLETA  •  USUARIO + TÉCNICO  •  V1.1", bg=GRAPHITE))
story.append(Spacer(1, 6*mm))
story.append(Paragraph("PalmerP<br/>Guía Completa del Sistema", ParagraphStyle("Cover", parent=sTitle, fontSize=30, leading=32)))
story.append(Paragraph("Fleet independiente + Triple Backup 3-2-1 + Updates 1-click como tú<br/>Por qué cada pieza existe y cómo operarla paso a paso, sin humo y sin huecos", sSub))
story.append(Spacer(1, 4*mm))
story.append(HRFlowable(width="100%", thickness=0.7, color=AMBER, spaceAfter=5*mm, spaceBefore=1*mm))
# KPIs
kpi = [[Paragraph("Fleet", ParagraphStyle("Kp", parent=sKPI, fontSize=14)), Paragraph("3-2-1", sKPI), Paragraph("1-Click", ParagraphStyle("Kp2", parent=sKPI, fontSize=14)), Paragraph("02:00", ParagraphStyle("Kp3", parent=sKPI, fontSize=14))],
       [Paragraph("1 casa por cliente<br/>su Vercel·Supabase·R2·MiniPC", sKpiLab), Paragraph("3 copias · 2 medios · 1 off-site<br/>90d vault inmutable", sKpiLab), Paragraph("cliente actualiza como tú<br/>misma branch, mismo build", sKpiLab), Paragraph("backup diario 02:00<br/>+ cron Vercel 02:30", sKpiLab)]]
kt = Table(kpi, colWidths=[44*mm]*4)
kt.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),AMBER_LIGHT),("BOX",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("INNERGRID",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),("ROUNDEDCORNERS",[3,3,3,3])]))
story.append(kt)
story.append(Spacer(1, 5*mm))
story.append(gbox("La promesa", "Cada cliente tiene <b>su casa</b> (no un piso compartido), <b>3 llaves</b> cada noche 02:00 y <b>la misma llave inglesa que tú</b> para actualizar. Si Vercel cae, quedan 2 copias. Si pierdes la clave, el vault no se abre — a propósito."))
story.append(Spacer(1, 3*mm))
# diag fleet
diag = [[Paragraph("<b>TÚ<br/><font size=6>Palm-ERP/palmerp</font></b><br/><font size=6>template</font>", sCell),
         Paragraph("→<br/><font size=6>template</font>", ParagraphStyle("Ar", parent=sCell, alignment=TA_CENTER, textColor=AMBER)),
         Paragraph("<b>CLIENTE-X<br/><font size=6>fork privado</font></b><br/><font size=6>push main → Vercel</font>", sCell),
         Paragraph("→", ParagraphStyle("Ar2", parent=sCell, alignment=TA_CENTER, textColor=AMBER)),
         Paragraph("<b>3 DESTINOS<br/><font size=6>02:00</font></b><br/><font size=6>A 7d  B 30d  C 90d</font>", sCell)],
        [Paragraph("publicas<br/>mejora", ParagraphStyle("Sm", parent=sCell, fontSize=6, textColor=GRAY, alignment=TA_CENTER)),
         Paragraph("", sCell),
         Paragraph("Supabase pooler 6543<br/>+ MiniPC siempre ON", ParagraphStyle("Sm2", parent=sCell, fontSize=6, textColor=GRAY, alignment=TA_CENTER)),
         Paragraph("", sCell),
         Paragraph("vault inmutable<br/>solo tu clave abre", ParagraphStyle("Sm3", parent=sCell, fontSize=6, textColor=GRAY, alignment=TA_CENTER))]]
td = Table(diag, colWidths=[36*mm, 18*mm, 48*mm, 10*mm, 44*mm])
td.setStyle(TableStyle([("BOX",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("INNERGRID",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),("LEFTPADDING",(0,0),(-1,-1),4),("ROUNDEDCORNERS",[3,3,3,3])]))
story.append(td)
story.append(Spacer(1, 3*mm))
story.append(Paragraph("Para quién: <b>dueño</b> (cap. 4 y 9, sin código) + <b>instalador</b> (cap. 5, comandos literales) + <b>tú</b> (fleet). Cada capítulo es independiente: ve al que necesites.", sBody))
story.append(HRFlowable(width="100%", thickness=0.3, color=HexColor("#E5E7EB"), spaceAfter=2*mm))

# TOC
story.append(Paragraph("Índice — 13 capítulos", sH1))
toc = [
    ("1", "La idea en 2 minutos — por qué este sistema", "4"),
    ("2", "Mapa visual — cómo encaja todo", "4"),
    ("3", "Por qué cada decisión (sin humo)", "5"),
    ("4", "Manual de Usuario — lo que ves cada día", "6"),
    ("5", "Manual del Instalador — de 0 a 100%", "7"),
    ("6", "Triple Backup 3-2-1 — tus 3 seguros", "10"),
    ("7", "MiniPC — copia A y cerebro local", "11"),
    ("8", "Actualizar como yo — 1 click sin miedo", "12"),
    ("9", "Operación diaria — 1 minuto", "13"),
    ("10", "Seguridad y claves", "14"),
    ("11", "Troubleshooting", "14"),
    ("12", "Checklists y entrega", "15"),
    ("13", "Glosario y referencias", "16"),
]
td_toc = [[Paragraph(f"<b>{r[0]}</b>", sCell), Paragraph(r[1], sCell), Paragraph(r[2], ParagraphStyle("Pg", parent=sCell, alignment=TA_CENTER))] for r in toc]
tt = Table(td_toc, colWidths=[8*mm, 152*mm, 16*mm])
tt.setStyle(TableStyle([("LINEBELOW",(0,0),(-1,-1),0.3,HexColor("#F3F4F6")),("TOPPADDING",(0,0),(-1,-1),2.5),("BOTTOMPADDING",(0,0),(-1,-1),2.5)]))
story.append(tt)

# Ch1
story.append(Paragraph("1 &nbsp; La idea en 2 minutos — por qué este sistema", sH1))
story.append(Paragraph("Antes: un SaaS central (<b>*.palmerp.es + 1 Supabase</b>) es barato pero te ata. Si Vercel cae, caen todos. Si un cliente quiere irse, no le puedes dar su base limpiamente. Si quieres ponerle un modelo local que aprende de su negocio, mezclarías datos. Y la factura de Vercel la pagas tú por todos.", sBody))
story.append(Paragraph("Ahora: <b>fleet independiente</b> — cada cliente su GitHub (fork template), su Vercel, su Supabase, su <b>R2 Cloudflare 10GB gratis</b> y su MiniPC. Tú mantienes <b>Palm-ERP/palmerp</b> como upstream; cada <b>git push origin master</b> suyo despliega solo su ERP. Él paga su nube, tú pagas solo el vault. <b>Triple backup 3-2-1</b> cada noche 02:00 con 2 artefactos cifrados solo con su clave en 3 sitios. <b>Updates 1-click como tú</b> con semáforo y backup previo.", sBody))
story.append(box("Cloudflare R2 — por qué 10 GB gratis", "Tus backups usan <b>R2</b> (<b>src/lib/storage.ts:3</b> + <b>storage-provider.ts:11</b>). R2 da <b>10 GB gratis + 0 € egress</b> (vs S3 que cobra por descarga) — 2-10 MB/noche × 90 días = 0,2-0,9 GB → gratis. Por eso <b>hosting_and_business_strategy.md:113</b> elige R2. Crear cuenta: <b>dash.cloudflare.com/sign-up → R2 → Enable → Create bucket cliente-backups / palmerp-vault → Manage R2 API Tokens → Access Key/Secret</b> (ver cap. 5.3b).", bg=LIGHT_BLUE, border=BLUE, icon="☁️"))
story.append(sbox("En una frase", "Es tu ERP, pero cada cliente duerme en <b>su casa</b>, con <b>3 llaves</b> y <b>la misma herramienta que tú</b> para actualizar."))
# Ch2
story.append(Paragraph("2 &nbsp; Mapa visual — cómo encaja todo", sH1))
story.append(Paragraph("Fleet — una casa por cliente", sH2))
story.append(Paragraph("Tu repo base es <b>template</b>. Cliente hace <b>fork privado → clone → .env → provision → Vercel import</b>. Tu base es <b>upstream</b>: <b>git remote add upstream https://github.com/Palm-ERP/palmerp.git</b>. Cuando tú haces <b>git push origin master</b> en palmerp, cada cliente hace <b>git fetch upstream && git merge upstream/master && git push origin master</b> y su Vercel despliega. El <b>control.palmerp.es</b> solo ve <b>heartbeats</b> (no sus datos).", sBody))
# fleet table visual
fleet_vis = [
    [Paragraph("<b>TÚ</b><br/>Palm-ERP/palmerp<br/><font size=6>template</font>", sCell), Paragraph("→<br/><font size=6>Use this template</font>", ParagraphStyle("Av", parent=sCell, alignment=TA_CENTER, textColor=AMBER)), Paragraph("<b>CLIENTE</b><br/>fork privado<br/><font size=6>clone · .env</font>", sCell), Paragraph("→<br/><font size=6>push main</font>", ParagraphStyle("Av2", parent=sCell, alignment=TA_CENTER, textColor=AMBER)), Paragraph("<b>VERCEL</b><br/>auto-deploy<br/><font size=6>1-2 min</font>", sCell)],
]
tf = Table(fleet_vis, colWidths=[34*mm, 22*mm, 40*mm, 22*mm, 38*mm])
tf.setStyle(TableStyle([("BOX",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("INNERGRID",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
story.append(tf)
story.append(Spacer(1,2*mm))
story.append(Paragraph("Backup 02:00 — 3 destinos", sH2))
bvis = [
    [Paragraph("<b>02:00 CET</b><br/>Vercel cron 02:30<br/>+ MiniPC 02:00", sCell), Paragraph("→", ParagraphStyle("Arr", parent=sCell, alignment=TA_CENTER, textColor=AMBER, fontSize=10)), Paragraph("<b>A LOCAL</b><br/>/data/...<br/>7 días", ParagraphStyle("B1", parent=sCell, alignment=TA_CENTER, backColor=TEAL_LIGHT)), Paragraph("<b>B TU NUBE</b><br/>R2 cliente<br/>30 días", ParagraphStyle("B2", parent=sCell, alignment=TA_CENTER, backColor=LIGHT_BLUE)), Paragraph("<b>C VAULT</b><br/>palmerp-vault<br/>90d inmutable", ParagraphStyle("B3", parent=sCell, alignment=TA_CENTER, backColor=AMBER_LIGHT))],
]
tb = Table(bvis, colWidths=[32*mm, 8*mm, 38*mm, 38*mm, 40*mm])
tb.setStyle(TableStyle([("BOX",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("INNERGRID",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
story.append(tb)
story.append(Spacer(1,2*mm))
story.append(Paragraph("Update 1-click", sH2))
uvis = [
    [Paragraph("<b>TÚ</b><br/>push main<br/>+ version bump", sCell), Paragraph("→", ParagraphStyle("Ar3", parent=sCell, alignment=TA_CENTER, textColor=AMBER)), Paragraph("<b>CLIENTE</b><br/>/admin/settings/updates<br/>N commits", sCell), Paragraph("→", ParagraphStyle("Ar4", parent=sCell, alignment=TA_CENTER, textColor=AMBER)), Paragraph("<b>APLICAR</b><br/>Vercel 7 cmds<br/>MiniPC 1 cmd", sCell)],
]
tu = Table(uvis, colWidths=[34*mm, 10*mm, 44*mm, 10*mm, 48*mm])
tu.setStyle(TableStyle([("BOX",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("INNERGRID",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
story.append(tu)

# Ch3
story.append(Paragraph("3 &nbsp; Por qué cada decisión <font color='#92400E' size=7>(sin humo)</font>", sH1))
rows = [
    [Paragraph("<b>Decisión</b>", sHead), Paragraph("<b>Por qué</b>", sHead), Paragraph("<b>Alternativa descartada</b>", sHead)],
    [Paragraph("<b>Fleet 1 DB/cliente</b>", sCell), Paragraph("Aislamiento real, GDPR limpio, se puede ir con pg_dump", sCell), Paragraph("Single-DB: barato pero 1 bug filtra datos, backup solo JSON", sCell)],
    [Paragraph("<b>Vercel por cliente</b>", sCell), Paragraph("Él paga su factura/dominio/env, tú no eres cuello", sCell), Paragraph("Wildcard 1 Vercel: 1 caída para todos", sCell)],
    [Paragraph("<b>Pooler 6543 ?pgbouncer</b>", sCell), Paragraph("Serverless necesita pooler", sCell), Paragraph("Direct 5432: too many connections", sCell)],
    [Paragraph("<b>3-2-1 triple backup</b>", sCell), Paragraph("3 copias, 2 medios, 1 off-site", sCell), Paragraph("Solo R2: si borras bucket adiós", sCell)],
    [Paragraph("<b>A LOCAL MiniPC</b>", sCell), Paragraph("No depende de internet", sCell), Paragraph("Solo nube: si Vercel cae a 02:00 no hay backup", sCell)],
    [Paragraph("<b>B R2 cliente</b>", sCell), Paragraph("Él controla su 2ª copia", sCell), Paragraph("Solo tu vault: si tú caes él nada", sCell)],
    [Paragraph("<b>C vault 90d inmutable</b>", sCell), Paragraph("Tu garantía aunque él borre B", sCell), Paragraph("Sin vault: borra A+B → nada", sCell)],
    [Paragraph("<b>Solo clave cliente</b>", sCell), Paragraph("Tú guardas .enc opaco, GDPR ok", sCell), Paragraph("Clave compartida: tú ves sus datos", sCell)],
    [Paragraph("<b>Logical + Physical</b>", sCell), Paragraph("Ligero vs clon exacto", sCell), Paragraph("Solo uno: secuencias o peso", sCell)],
    [Paragraph("<b>02:00 CET</b>", sCell), Paragraph("Valle, menos locks", sCell), Paragraph("23:30: más carga", sCell)],
    [Paragraph("<b>MiniPC siempre ON</b>", sCell), Paragraph("Garantiza A+physical", sCell), Paragraph("Apagable: noche sin A", sCell)],
    [Paragraph("<b>Updates como tú</b>", sCell), Paragraph("1 flujo, 1 verdad", sCell), Paragraph("Deploy central: riesgoso", sCell)],
    [Paragraph("<b>Backup antes update</b>", sCell), Paragraph("Rollback", sCell), Paragraph("Sin backup: migration rota sin vuelta", sCell)],
    [Paragraph("<b>Build antes push</b>", sCell), Paragraph("No despliegas roto", sCell), Paragraph("Push directo: Vercel falla en prod", sCell)],
]
tr = Table(rows, colWidths=[32*mm, 58*mm, 66*mm])
tr.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GRAPHITE),("ROWBACKGROUNDS",(0,1),(-1,-1),[white, GRAY_LIGHT]),("GRID",(0,0),(-1,-1),0.3,HexColor("#E5E7EB")),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),("LEFTPADDING",(0,0),(-1,-1),3),("RIGHTPADDING",(0,0),(-1,-1),3)]))
story.append(tr)

# Ch4 user
story.append(Paragraph("4 &nbsp; Manual de Usuario — lo que ves cada día", sH1))
story.append(Paragraph("Si eres dueño, lee solo este capítulo. No toques .env ni MiniPC.", ParagraphStyle("Note", parent=sBody, fontName="Helvetica-Oblique", textColor=GRAY)))
story.append(Paragraph("Entrar", sH2))
story.append(Paragraph("1) Abre <b>https://tu-dominio.vercel.app/login</b> 2) Email + contraseña (te la dio el instalador) 3) Entrar → <b>/admin</b> (dashboard, contactos, ventas…)", sBody))
story.append(Paragraph("Tu minuto cada mañana (café en mano)", sH2))
story.append(Paragraph("No abras 3 consolas. Mira un semáforo en <b>/admin/settings/updates</b> o <b>/api/fleet/backup-heartbeat</b>:", sBody))
sema = [[Paragraph("<b>Color</b>", sHead), Paragraph("<b>Significa</b>", sHead), Paragraph("<b>Qué hacer</b>", sHead)],
        [Paragraph("<font color='#059669'>● Verde</font>", sCell), Paragraph("Backup &lt;24h en 3 sitios, al día", sCell), Paragraph("Nada. Trabaja.", sCell)],
        [Paragraph("<font color='#D97706'>● Amarillo</font>", sCell), Paragraph("24-48h o 2 destinos", sCell), Paragraph("Pide backup manual al instalador", sCell)],
        [Paragraph("<font color='#DC2626'>● Rojo</font>", sCell), Paragraph("&gt;48h o fallido", sCell), Paragraph("Llama hoy", sCell)]]
ts = Table(sema, colWidths=[26*mm, 62*mm, 68*mm])
ts.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GRAPHITE),("ROWBACKGROUNDS",(0,1),(-1,-1),[white, GRAY_LIGHT]),("GRID",(0,0),(-1,-1),0.3,HexColor("#E5E7EB")),("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3)]))
story.append(ts)
story.append(Spacer(1,2*mm))
story.append(Paragraph("Si borras algo", sH2))
story.append(Paragraph("Pide restore <b>lógico</b> de anoche (no borra, solo añade lo que falta): instalador hace <b>GET /api/admin/restore?tenantId=xxx → elige *.logical.json.gz.enc → descarga del MiniPC/R2/vault → POST dryRun:true → preview → dryRun:false</b>. Si hay que reconstruir todo, es <b>físico</b> del MiniPC: <b>psql \"$DATABASE_URL\" &lt; dump.sql</b> en staging primero.", sBody))
story.append(Paragraph("Pedir actualización", sH2))
story.append(Paragraph("Ajustes → Actualizaciones → <b>Comprobar</b> → si sale <b>3 commits por detrás</b> copia el bloque <b>Vercel</b> (7 líneas) o <b>MiniPC</b> (<b>npm run fleet:update</b>) y lo ejecuta el instalador. Si el build falla, no se despliega. Siempre hay backup de esa noche.", sBody))

# Ch5 installer
story.append(Paragraph("5 &nbsp; Manual del Instalador — de 0 a 100% paso a paso", sH1))
story.append(Paragraph("Tu contrato. Cada paso tiene comando literal y salida esperada. No avances si falla.", ParagraphStyle("Contract", parent=sBody, fontName="Helvetica-Oblique", textColor=GRAY)))
story.append(Paragraph("Mapa 0-100%", sH2))
story.append(Paragraph("Pre-requisitos (5') → Fork+upstream (2') → Supabase (3') → Claves (1') → .env (3') → npm ci+prisma+provision (4') → Vercel (3') → MiniPC (5') → Verificación (4') → Handover (2')", sBody))
# 5.1
story.append(Paragraph("5.1 Pre-requisitos", sH3))
story.append(Paragraph("☐ GitHub privado cliente  ☐ Vercel Team cliente  ☐ Supabase eu-central-1  ☐ R2 cliente (Account ID+bucket+keys) B 30d  ☐ R2 PalmerP palmerp-vault C 90d  ☐ MiniPC Ubuntu 22/24 Node≥20.9 50GB siempre ON SSH  ☐ Datos slug/name/adminName/adminEmail/domain  ☐ Tu portátil: node≥20.9 npm git openssl curl jq", sBullet, bulletText="•"))
story.append(Paragraph("node -v  •  npm -v  •  git --version  •  openssl version", sCode))
# 5.2
story.append(Paragraph("5.2 GitHub — fork + upstream", sH3))
story.append(step(1, "Template", "https://github.com/Palm-ERP/palmerp → Use this template → cliente-x Private sin Include all branches", None))
story.append(step(2, "Si no es template", "git clone https://github.com/Palm-ERP/palmerp.git cliente-x && cd cliente-x && git remote remove origin && gh repo create cliente-x --private --source=. --remote=origin --push", None))
story.append(step(3, "Upstream siempre", "git remote add upstream https://github.com/Palm-ERP/palmerp.git && git remote -v  # origin+upstream", None))
story.append(Paragraph("Cuando publiques mejora: <b>git fetch upstream && git merge upstream/master --no-edit && git push origin master</b> → Vercel cliente despliega", sBody))
# 5.3
story.append(Paragraph("5.3 Supabase — pooler 6543", sH3))
story.append(Paragraph("Supabase → New Project cliente-x eu-central-1 → espera 2' → Project Settings → Database → Connection string → URI → <b>Pooler 6543 ?pgbouncer=true</b> → copia <b>DATABASE_URL</b>. Fleet = 1 DB por cliente.", sBody))
story.append(Paragraph('postgresql://postgres.xxxxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true', sCode))
story.append(Paragraph('psql "postgresql://..." -c "select 1"  # → 1', sCode))
# 5.4
story.append(Paragraph("5.4 Claves — una vez", sH3))
story.append(Paragraph("openssl rand -base64 32 | tr -d '\\n'  # BACKUP_ENCRYPTION_KEY 44 chars SOLO cliente QR caja fuerte<br/>openssl rand -base64 32 | tr -d '\\n'  # NEXTAUTH_SECRET<br/>openssl rand -base64 32 | tr -d '\\n'  # CRON_SECRET<br/>openssl rand -base64 32 | tr -d '\\n'  # FLEET_API_KEY", sCode))
story.append(wbox("No a Git", ".gitignore ignora .env*. Verifica git status que no aparece."))
# 5.5
story.append(Paragraph("5.5 .env — todas las vars", sH3))
story.append(Paragraph("cd cliente-x && cp .env.example .env.local && nano .env.local  → rellena mínimo y replica idéntico en Vercel → Settings → Environment Variables (Production)", sBody))
envt = [
    [Paragraph("<b>Var</b>", sHead), Paragraph("<b>Ejemplo</b>", sHead), Paragraph("<b>Si falta</b>", sHead)],
    [Paragraph("DATABASE_URL", sCell), Paragraph("pooler 6543", sCell), Paragraph("migrate/backup fallan", sCell)],
    [Paragraph("NEXTAUTH_*", sCell), Paragraph("URL + secret", sCell), Paragraph("login loop", sCell)],
    [Paragraph("BACKUP_ENCRYPTION_KEY", sCell), Paragraph("44 chars", sCell), Paragraph("gz sin cifrar, auth failed", sCell)],
    [Paragraph("BACKUP_LOCAL_DIR", sCell), Paragraph("/data/backups/palmerp", sCell), Paragraph("usa default", sCell)],
    [Paragraph("CLIENT_BACKUP_S3_*", sCell), Paragraph("R2 cliente B", sCell), Paragraph("B not configured PARTIAL", sCell)],
    [Paragraph("PALMERP_VAULT_R2_*", sCell), Paragraph("vault PalmerP C", sCell), Paragraph("C not configured", sCell)],
    [Paragraph("CRON_SECRET", sCell), Paragraph("Bearer", sCell), Paragraph("401 cron", sCell)],
    [Paragraph("FLEET_API_KEY", sCell), Paragraph("Bearer", sCell), Paragraph("heartbeat no envía", sCell)],
    [Paragraph("PALMERP_UPSTREAM_*", sCell), Paragraph("Palm-ERP/palmerp main", sCell), Paragraph("check usa default", sCell)],
]
te = Table(envt, colWidths=[36*mm, 58*mm, 62*mm])
te.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GRAPHITE),("ROWBACKGROUNDS",(0,1),(-1,-1),[white, GRAY_LIGHT]),("GRID",(0,0),(-1,-1),0.3,HexColor("#E5E7EB")),("TOPPADDING",(0,0),(-1,-1),2.5),("BOTTOMPADDING",(0,0),(-1,-1),2.5)]))
story.append(te)
# 5.6
story.append(Paragraph("5.6 Instalar y provisionar", sH3))
story.append(Paragraph("npm ci --legacy-peer-deps  # added packages<br/>npx prisma generate  # ✔ Generated<br/>npx prisma migrate deploy  # 3 applied<br/>npm run instance:provision -- --slug cliente-x --name \"Cliente X S.L.\" --domain cliente-x.palmerp.es --admin-name \"Ana\" --admin-email ana@cliente.es --admin-password \"Cambia123!\"  # Tenant seeded<br/># atajo: node scripts/template-bootstrap.mjs (genera .env+claves+provisiona)<br/>npx tsc --noEmit --skipLibCheck  # sin output = OK<br/>npm run build  # ✓ 67 rutas<br/>./init.sh  # [OK]<br/>npm run dev  # http://localhost:3000", sCode))
# 5.7
story.append(Paragraph("5.7 Vercel — import + auto-deploy", sH3))
story.append(Paragraph("vercel.com → Add New Project → Import cliente-x → Build prisma generate && next build → Add Env (las de 5.5 Production) → Deploy → Visit → Domains → Add cliente.es → Cron Jobs verifica 30 2 * * * /api/cron/daily-backups → git commit --allow-empty -m \"test\" && git push origin master → Deployments verde", sBody))
# 5.8
story.append(Paragraph("5.8 MiniPC — agente 02:00", sH3))
story.append(Paragraph("ssh mini@192.168.1.50<br/>sudo apt update && sudo apt install -y nodejs npm postgresql-client git curl jq && node -v && pg_dump --version<br/>sudo mkdir -p /data/backups/palmerp && sudo chown $USER:$USER /data/backups/palmerp<br/>git clone https://github.com/cliente/cliente-x.git /opt/palmerp && cd /opt/palmerp && npm ci --legacy-peer-deps && cp .env.example .env && nano .env  # MISMAS vars Vercel<br/>npm run backup:agent  # o node scripts/backup-agent.mjs --once → 2 .enc + B/C uploaded<br/>ls -lh /data/backups/palmerp/tenants/*/daily/<br/>sudo cp scripts/systemd/palmerp-backup.* /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now palmerp-backup.timer && systemctl list-timers | grep palmerp<br/>sudo systemctl start palmerp-backup.service && journalctl -u palmerp-backup.service -n 50 --no-pager", sCode))
# 5.9
story.append(Paragraph("5.9 Verificación — no entregues sin esto", sH3))
story.append(Paragraph("npx prisma generate && npx tsc --noEmit --skipLibCheck && npm run build && ./init.sh  # todo [OK]<br/>curl -H \"Authorization: Bearer $CRON_SECRET\" https://cliente-x.vercel.app/api/cron/daily-backups | jq .summary  # success 1<br/>npm run backup:agent && ls -lh /data/.../daily/  # 2 .enc<br/>curl -H \"Bearer $FLEET_API_KEY\" https://control.palmerp.es/api/fleet/backup-heartbeat | jq .status  # green &lt;24h<br/>npm run fleet:check  # Al día / N commits<br/>curl https://cliente-x.vercel.app/api/admin/updates | jq .reason<br/>open https://cliente-x.vercel.app/admin/settings/updates<br/>open https://cliente-x.vercel.app/login  # ana@cliente.es", sCode))

# Ch6 backup
story.append(Paragraph("6 &nbsp; Triple Backup 3-2-1 — tus 3 seguros", sH1))
story.append(Paragraph("Qué guarda: <b>Logical JSON</b> (Tenant/Users/Contacts/Shops/Orders/AuditLogs filtrado tenantId → gzip→AES-GCM→sha256→BackupLog) y <b>Physical pg_dump</b> (clon exacto solo MiniPC → gzip→encrypt). Dónde: <b>A LOCAL 7d</b> /data, <b>B R2 cliente 30d</b> CLIENT_BACKUP_S3_*, <b>C Vault palmerp-vault 90d inmutable</b> (vault/tenants/... sin delete). Código: src/lib/backup/crypto.ts, storage-provider.ts (3 providers), runner.ts (retención), daily-backups 02:30, backup-agent.mjs.", sBody))
story.append(sbox("Tranquilidad", "Aunque Vercel+Supabase caigan, quedan 2 copias. Vault solo lo abre su clave."))
# Ch7 minipc
story.append(Paragraph("7 &nbsp; MiniPC — copia A y cerebro local", sH1))
story.append(Paragraph("Siempre ON. Dos roles: 1) Guardián backup físico (único que crea physical) 2) Cerebro local Ollama + vector DB que aprende de su negocio sin enviar datos fuera (nightly ETL → embeddings → /api/insights). Sin MiniPC esa noche no hay A ni physical (amarillo).", sBody))
# Ch8 updates
story.append(Paragraph("8 &nbsp; Actualizar como yo — 1 click, sin miedo", sH1))
story.append(Paragraph("Tú publicas: <b>package.json version 0.1.0→0.2.0 + git push origin master en Palm-ERP/palmerp</b>. Cliente ve en <b>/admin/settings/updates</b> via <b>GET /api/admin/updates → src/lib/fleet/upstream.ts</b> (GitHub API o git ls-remote, git rev-list --count, semver) → <b>N commits por detrás</b> + backup age.", sBody))
story.append(Paragraph("Vercel (7 cmds copia/pega):", sH3))
story.append(Paragraph("git fetch upstream<br/>git merge upstream/master --no-edit --no-ff<br/>npm ci --legacy-peer-deps<br/>npx prisma generate<br/>npx prisma migrate deploy<br/>npm run build<br/>git push origin master  # Vercel 1-2 min", sCode))
story.append(Paragraph("MiniPC (1 cmd):", sH3))
story.append(Paragraph("npm run fleet:update  # = --apply → backup → fetch → merge → npm ci → migrate → build → push → pm2 restart<br/>npm run fleet:check  # solo informa<br/>node scripts/fleet-update.mjs --dry-run  # simula<br/>No push si build falla; merge --abort si conflicto; GITHUB_TOKEN si repo privado; PALMERP_UPSTREAM_REPO en .env", sCode))
story.append(Paragraph("APIs: /api/admin/updates, /api/fleet/check-update, lib/fleet/version.ts. Seguridad: build antes push, backup previo 3 destinos.", sBody))
# Ch9
story.append(Paragraph("9 &nbsp; Operación diaria — 1 minuto", sH1))
story.append(Paragraph("1) /admin/settings/updates o curl /api/fleet/backup-heartbeat | jq .status → verde? sigue 2) Amarillo 24-48h → curl cron o backup:agent 3) Rojo &gt;48h → systemctl status palmerp-backup.timer, pg_dump --version, env grep BACKUP, journalctl", sBody))
story.append(Paragraph("Logs: BackupLog (destination/fileKey/checksum/size/encrypted/status) + AuditLog BACKUP_RUN/HEARTBEAT. PARTIAL = algún destino falló pero al menos uno guardó.", sBody))
# Ch10
story.append(Paragraph("10 &nbsp; Seguridad y claves", sH1))
story.append(Paragraph("BACKUP_ENCRYPTION_KEY 44 chars: solo cliente, vault .enc opaco, pierdes clave → auth failed forever. Guarda en Vercel Env + MiniPC .env + QR papel caja fuerte + NAS. NEXTAUTH_SECRET/CRON_SECRET/FLEET_API_KEY: openssl rand -base64 32. .env* nunca a Git. RLS tenant_id + where + withTenantContext. Vault 90d inmutable sin delete.", sBody))
# Ch11
story.append(Paragraph("11 &nbsp; Troubleshooting", sH1))
tro = [
    [Paragraph("<b>Error</b>", sHead), Paragraph("<b>Causa</b>", sHead), Paragraph("<b>Fix</b>", sHead)],
    [Paragraph("Can't find DATABASE_URL", sCell), Paragraph(".env no cargado", sCell), Paragraph("cp .env.example .env.local", sCell)],
    [Paragraph("P1001 Can't reach", sCell), Paragraph("pooler 5432 sin ?pgbouncer", sCell), Paragraph("6543 ?pgbouncer=true", sCell)],
    [Paragraph("Ya existe slug", sCell), Paragraph("Tenant existe", sCell), Paragraph("prisma studio borra", sCell)],
    [Paragraph("401 cron", sCell), Paragraph("CRON_SECRET mal", sCell), Paragraph("Vercel Env = Bearer", sCell)],
    [Paragraph("not configured B/C", sCell), Paragraph("R2 vars vacías", sCell), Paragraph("rellena Vercel+MiniPC", sCell)],
    [Paragraph("Solo LOGICAL Vercel", sCell), Paragraph("normal", sCell), Paragraph("physical solo MiniPC", sCell)],
    [Paragraph("BACKUP_KEY no configurada", sCell), Paragraph(".env MiniPC vacío", sCell), Paragraph("copia de Vercel", sCell)],
    [Paragraph("pg_dump not available", sCell), Paragraph("no instalado", sCell), Paragraph("apt install postgresql-client", sCell)],
    [Paragraph("auth failed restore", sCell), Paragraph("clave distinta", sCell), Paragraph("usa clave que cifró", sCell)],
    [Paragraph("git push no despliega", sCell), Paragraph("no conectado", sCell), Paragraph("Import fork branch main", sCell)],
    [Paragraph("fleet always 1 behind", sCell), Paragraph("sin fetch", sCell), Paragraph("git fetch upstream", sCell)],
]
tt2 = Table(tro, colWidths=[38*mm, 52*mm, 66*mm])
tt2.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GRAPHITE),("ROWBACKGROUNDS",(0,1),(-1,-1),[white, GRAY_LIGHT]),("GRID",(0,0),(-1,-1),0.3,HexColor("#E5E7EB")),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),2.5),("BOTTOMPADDING",(0,0),(-1,-1),2.5)]))
story.append(tt2)
story.append(Spacer(1,2*mm))
story.append(Paragraph("vercel logs --follow<br/>journalctl -u palmerp-backup.service -n 100<br/>ls -lh /data/backups/palmerp/tenants/*/daily/<br/>npx prisma studio", sCode))
# Ch12
story.append(Paragraph("12 &nbsp; Checklists y entrega", sH1))
story.append(Paragraph("Instalador — firma antes de irte", sH2))
checks = ["Clave en 4 sitios (Vercel, MiniPC, QR, NAS)", "DATABASE_URL pooler psql select 1 OK", "prisma generate+migrate OK", "build 67 rutas + init.sh OK + tsc OK", "Vercel import main auto-deploy push OK", "Cron 02:30 visible", "MiniPC /data ok pg_dump OK 2 .enc B/C OK", "systemd timer 02:00 enable --now OK", "curl cron success 3 destinos", "heartbeat verde <24h", "restore dryRun:true OK", "upstream git remote -v origin+upstream", "updates /admin/settings/updates verde + fleet:check OK", "Handover PDF+QR+accesos", "Cliente sabe push/fetch/semáforo/updates como tú"]
for c in checks:
    story.append(Paragraph(f"☐  {c}", sBullet, bulletText=""))
story.append(Spacer(1,2*mm))
story.append(Paragraph("Entrega dueño: Manual PDF + QR clave en sobre + invites Vercel/Supabase/GitHub ADMIN + URLs https://cliente-x.vercel.app + /admin + control.palmerp.es + frase: “Si ves verde y guardas la clave en caja fuerte, estás cubierto aunque falle Vercel. Yo veo el vault pero no puedo abrirlo sin ti. Actualizas como yo en /admin/settings/updates.”", sBody))
# Ch13
story.append(Paragraph("13 &nbsp; Glosario y referencias", sH1))
glo = [
    [Paragraph("<b>Término</b>", sHead), Paragraph("<b>Qué es</b>", sHead)],
    [Paragraph("Fleet", sCell), Paragraph("1 casa por cliente vs Single-DB compartida", sCell)],
    [Paragraph("Upstream", sCell), Paragraph("Palm-ERP/palmerp template base", sCell)],
    [Paragraph("Logical JSON", sCell), Paragraph("JSON tenantId → gzip→encrypt, Vercel+MiniPC", sCell)],
    [Paragraph("Physical", sCell), Paragraph("pg_dump --no-owner → gzip→encrypt, solo MiniPC", sCell)],
    [Paragraph("Vault inmutable", sCell), Paragraph("palmerp-vault 90d sin delete cliente", sCell)],
    [Paragraph("Fleet update", sCell), Paragraph("fetch→merge→npm ci→migrate→build→push", sCell)],
]
tg = Table(glo, colWidths=[38*mm, 118*mm])
tg.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GRAPHITE),("ROWBACKGROUNDS",(0,1),(-1,-1),[white, GRAY_LIGHT]),("GRID",(0,0),(-1,-1),0.3,HexColor("#E5E7EB")),("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3)]))
story.append(tg)
story.append(Spacer(1,2*mm))
story.append(Paragraph("Referencias archivo:línea: package.json:1, vercel.json:1, prisma/schema.prisma:1, src/lib/db.ts:1, src/lib/backup/*:1, src/lib/fleet/*:1, src/app/api/cron/daily-backups, src/app/api/admin/updates, scripts/*:1, docs/TEMPLATE-INSTALADOR.md:1, docs/architecture.md", ParagraphStyle("Ref", parent=sBody, fontSize=6, textColor=GRAY)))
story.append(Spacer(1,4*mm))
story.append(HRFlowable(width="100%", thickness=0.7, color=AMBER))
story.append(Paragraph("PalmerP — Hecho con mimo en Europa — 2026 — Si este manual te dio tranquilidad, cumplió su misión. 🌙", ParagraphStyle("Outro", parent=sBody, alignment=TA_CENTER, fontSize=8, textColor=GRAY)))

doc.build(story, onFirstPage=hf, onLaterPages=hf)
print(f"PDF: {OUT} ({os.path.getsize(OUT)} bytes)")
