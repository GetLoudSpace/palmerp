#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera manual pedagógico PDF para Triple Backup + Fleet con ReportLab
Estilo claro, caras? = claro, sencillo, premium
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, HRFlowable, Image, KeepTogether, ListFlowable, ListItem)
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

OUT = "/Users/renatopaolo/palmerp/docs/Manual-PalmerP-Triple-Backup-Fleet.pdf"

# Paleta premium Palmera (grafito + ámbar)
AMBER = HexColor("#D97706")
AMBER_DARK = HexColor("#92400E")
AMBER_LIGHT = HexColor("#FEF3C7")
GRAPHITE = HexColor("#1F2937")
LIGHT_BLUE = HexColor("#EFF6FF")
GRAPHITE_LIGHT = HexColor("#6B7280")
GRAPHITE_ULTRA = HexColor("#F9FAFB")
TEAL = HexColor("#0F766E")
TEAL_LIGHT = HexColor("#CCFBF1")
GREEN = HexColor("#059669")
RED = HexColor("#DC2626")
BLUE = HexColor("#2563EB")

W, H = A4

def header_footer(canvas, doc):
    canvas.saveState()
    # Top bar
    canvas.setFillColor(GRAPHITE)
    canvas.rect(0, H-14*mm, W, 14*mm, stroke=0, fill=1)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(15*mm, H-9*mm, "PALMERP  •  Sistema Triple Backup 3-2-1  •  Fleet Independiente")
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(W-15*mm, H-9*mm, "Manual pedagógico  •  02:00  •  Solo clave cliente")
    # Footer
    canvas.setFillColor(GRAPHITE_LIGHT)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(15*mm, 10*mm, "PalmerP ERP Core  •  Confidencial  •  Si pierdes la BACKUP_ENCRYPTION_KEY el backup es irrecuperable")
    canvas.drawRightString(W-15*mm, 10*mm, f"Pág. {doc.page}")
    canvas.restoreState()

styles = getSampleStyleSheet()

sTitle = ParagraphStyle("Title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=28, leading=30, textColor=GRAPHITE, alignment=TA_LEFT, spaceAfter=4*mm)
sSubtitle = ParagraphStyle("Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=16, textColor=GRAPHITE_LIGHT, alignment=TA_LEFT)
sH1 = ParagraphStyle("H1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=19, textColor=GRAPHITE, spaceBefore=8*mm, spaceAfter=4*mm, keepWithNext=True)
sH2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=AMBER_DARK, spaceBefore=6*mm, spaceAfter=3*mm, keepWithNext=True)
sH3 = ParagraphStyle("H3", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=GRAPHITE, spaceBefore=4*mm, spaceAfter=2*mm)
sBody = ParagraphStyle("Body", parent=styles["Normal"], fontName="Helvetica", fontSize=9.5, leading=14, textColor=GRAPHITE, alignment=TA_JUSTIFY, spaceAfter=2*mm)
sBullet = ParagraphStyle("Bullet", parent=sBody, leftIndent=10*mm, bulletIndent=5*mm, spaceAfter=1.5*mm)
sCaption = ParagraphStyle("Caption", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=7.5, leading=10, textColor=GRAPHITE_LIGHT, alignment=TA_CENTER, spaceAfter=3*mm)
sCode = ParagraphStyle("Code", parent=styles["Code"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=GRAPHITE, backColor=HexColor("#F3F4F6"), borderPadding=(3,3,6), spaceAfter=2*mm)
sBadge = ParagraphStyle("Badge", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7, leading=9, textColor=white, alignment=TA_CENTER)
sTableCell = ParagraphStyle("TableCell", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10, textColor=GRAPHITE)
sTableHeader = ParagraphStyle("TableHeader", parent=sTableCell, fontName="Helvetica-Bold", textColor=white, alignment=TA_CENTER)
sKPI = ParagraphStyle("KPI", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=22, leading=22, textColor=GRAPHITE, alignment=TA_CENTER)
sKpiLabel = ParagraphStyle("KpiLabel", parent=styles["Normal"], fontName="Helvetica", fontSize=7, leading=8, textColor=GRAPHITE_LIGHT, alignment=TA_CENTER)

def badge(text, bg=AMBER):
    t = Table([[Paragraph(text, sBadge)]], colWidths=[28*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("ROUNDEDCORNERS", [3,3,3,3]),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    return t

def info_box(title, body, bg=AMBER_LIGHT, border=AMBER, icon="💡"):
    inner = [
        [Paragraph(f"<b>{icon}  {title}</b>", ParagraphStyle("BoxTitle", parent=sBody, fontName="Helvetica-Bold", fontSize=9, textColor=GRAPHITE))],
        [Paragraph(body, sBody)],
    ]
    t = Table(inner, colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("BOX", (0,0), (-1,-1), 0.6, border),
        ("ROUNDEDCORNERS", [4,4,4,4]),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    return t

def warning_box(title, body):
    return info_box(title, body, bg=HexColor("#FEF2F2"), border=RED, icon="⚠️")

def success_box(title, body):
    return info_box(title, body, bg=HexColor("#ECFDF5"), border=GREEN, icon="✅")

def step_table(num, title, desc, cmd=None):
    # num circle + content
    num_style = ParagraphStyle("Num", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=14, leading=14, textColor=white, alignment=TA_CENTER)
    circle = Table([[Paragraph(str(num), num_style)]], colWidths=[10*mm], rowHeights=[10*mm])
    circle.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), AMBER),
        ("ROUNDEDCORNERS", [5,5,5,5]),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    content = []
    content.append(Paragraph(f"<b>{title}</b>", ParagraphStyle("StepTitle", parent=sBody, fontName="Helvetica-Bold", fontSize=10, textColor=GRAPHITE, spaceAfter=1*mm)))
    content.append(Paragraph(desc, sBody))
    if cmd:
        content.append(Paragraph(f'<font face="Helvetica" color="#1F2937"><b>$</b> {cmd}</font>', sCode))
    # assemble
    t = Table([[circle, content]], colWidths=[12*mm, 158*mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 2),
        ("RIGHTPADDING", (0,0), (-1,-1), 2),
        ("TOPPADDING", (0,0), (-1,-1), 2),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    return t

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=15*mm, rightMargin=15*mm, topMargin=18*mm, bottomMargin=14*mm, title="Manual PalmerP Triple Backup", author="PalmerP")

story = []

# COVER
story.append(Spacer(1, 10*mm))
story.append(badge("MANUAL PEDAGÓGICO  •  V1.0  •  15 SEPT 2026", bg=GRAPHITE))
story.append(Spacer(1, 8*mm))
story.append(Paragraph("PalmerP<br/>Triple Backup 3-2-1", ParagraphStyle("CoverTitle", parent=sTitle, fontSize=34, leading=36, textColor=GRAPHITE)))
story.append(Paragraph("Instrucciones sencillas, claras y bonitas<br/>para dormir tranquilo: tus datos a salvo aunque falle Vercel o Supabase", sSubtitle))
story.append(Spacer(1, 6*mm))
story.append(HRFlowable(width="100%", thickness=0.8, color=AMBER, spaceAfter=6*mm, spaceBefore=2*mm))

# KPIs row
kpi_data = [
    [Paragraph("3", sKPI), Paragraph("2", sKPI), Paragraph("1", sKPI), Paragraph("02:00", ParagraphStyle("KPI2", parent=sKPI, fontSize=18))],
    [Paragraph("copias<br/>cada noche", sKpiLabel), Paragraph("medios<br/>distintos", sKpiLabel), Paragraph("copia off-site<br/>inmutable 90 días", sKpiLabel), Paragraph("hora fija<br/>Europe/Madrid", sKpiLabel)],
]
kpi_table = Table(kpi_data, colWidths=[42.5*mm]*4)
kpi_table.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), AMBER_LIGHT),
    ("BACKGROUND", (0,1), (-1,1), HexColor("#FFFFFF")),
    ("BOX", (0,0), (-1,-1), 0.4, HexColor("#E5E7EB")),
    ("INNERGRID", (0,0), (-1,-1), 0.4, HexColor("#E5E7EB")),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("ROUNDEDCORNERS", [4,4,4,4]),
]))
story.append(kpi_table)
story.append(Spacer(1, 6*mm))

story.append(info_box("La promesa en una frase", "Cada noche a las <b>02:00</b> se guardan <b>2 artefactos</b> (<i>logical JSON + pg_dump físico</i>) cifrados <b>solo con tu clave</b> en <b>3 lugares</b>: <b>A)</b> disco del MiniPC del cliente, <b>B)</b> tu R2/S3 propio, <b>C)</b> vault central PalmerP inmutable 90 días. PalmerP no puede abrir el candado sin ti.", bg=TEAL_LIGHT, border=TEAL, icon="🔐"))

story.append(Spacer(1, 4*mm))
# Mini diagrama textual
diag = [
    [Paragraph("<b><font color='#1F2937'>02:00 CET</font>  Cron</b><br/><font color='#6B7280' size=7>Vercel + MiniPC</font>", sTableCell),
     Paragraph("→", ParagraphStyle("Arrow", parent=sTableCell, alignment=TA_CENTER, fontSize=14, textColor=AMBER)),
     Paragraph("<b>A  LOCAL</b><br/><font size=7>MiniPC /NAS<br/>7 días</font>", ParagraphStyle("DiagA", parent=sTableCell, alignment=TA_CENTER, backColor=TEAL_LIGHT)),
     Paragraph("<b>B  TU NUBE</b><br/><font size=7>Tu R2/S3<br/>30 días</font>", ParagraphStyle("DiagB", parent=sTableCell, alignment=TA_CENTER, backColor=HexColor("#DBEAFE"))),
     Paragraph("<b>C  VAULT PALMERP</b><br/><font size=7>Inmutable<br/>90 días</font>", ParagraphStyle("DiagC", parent=sTableCell, alignment=TA_CENTER, backColor=AMBER_LIGHT)),
    ]
]
t_diag = Table(diag, colWidths=[30*mm, 10*mm, 38*mm, 38*mm, 42*mm])
t_diag.setStyle(TableStyle([
    ("BOX", (0,0), (-1,-1), 0.5, HexColor("#E5E7EB")),
    ("INNERGRID", (0,0), (-1,-1), 0.5, HexColor("#E5E7EB")),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 6),
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ("LEFTPADDING", (0,0), (-1,-1), 4),
    ("RIGHTPADDING", (0,0), (-1,-1), 4),
    ("ROUNDEDCORNERS", [4,4,4,4]),
]))
story.append(t_diag)
story.append(Spacer(1, 4*mm))
story.append(Paragraph("<b>Para quién es este manual:</b> dueño del negocio + persona que instala el MiniPC + quien gestiona Vercel/Supabase. Sin tecnicismos. Sigue los pasos en orden, marca cada casilla ✅.", sBody))
story.append(Spacer(1, 2*mm))
story.append(info_box("Cloudflare R2 — 10 GB gratis", "Tus backups B y C usan <b>Cloudflare R2</b> ( <b>src/lib/storage.ts:3</b> + <b>storage-provider.ts:11</b> con <b>https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com</b>). R2 da <b>10 GB gratis + 0 € por descarga</b> (vs AWS S3 que cobra). 2-10 MB/noche × 90 días = 0,2-0,9 GB → gratis. Necesitas 1 cuenta Cloudflare para el cliente (bucket <b>cliente-backups</b>) y 1 para tu vault (<b>palmerp-vault</b>). Pasos en cap. 2b.", bg=LIGHT_BLUE, border=BLUE, icon="☁️"))
story.append(Spacer(1, 3*mm))
story.append(HRFlowable(width="100%", thickness=0.4, color=HexColor("#E5E7EB")))

# Indice
story.append(Paragraph("Índice", sH1))
toc = [
    ["1", "Qué guarda y dónde (en 1 minuto)", "3"],
    ["2", "Antes de empezar: lo que necesitas", "3"],
    ["2b", "Cloudflare R2 — 10 GB gratis (paso a paso)", "3"],
    ["3", "Instalación paso a paso (15 min)", "4"],
    ["4", "El MiniPC: agente local 02:00", "6"],
    ["5", "Comprobar cada mañana (1 min)", "7"],
    ["6", "Restaurar: cuando algo sale mal", "8"],
    ["7", "Fleet: cómo gestionas tú las instancias", "9"],
    ["8", "Preguntas frecuentes", "10"],
]
toc_data = [[Paragraph(f"<b>{r[0]}</b>", sTableCell), Paragraph(r[1], sTableCell), Paragraph(r[2], ParagraphStyle("TocPage", parent=sTableCell, alignment=TA_CENTER))] for r in toc]
t_toc = Table(toc_data, colWidths=[10*mm, 145*mm, 15*mm])
t_toc.setStyle(TableStyle([
    ("LINEBELOW", (0,0), (-1,-1), 0.4, HexColor("#F3F4F6")),
    ("TOPPADDING", (0,0), (-1,-1), 3),
    ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ("LEFTPADDING", (0,0), (-1,-1), 2),
]))
story.append(t_toc)

# Cap 1
story.append(Paragraph("1 &nbsp; Qué guarda y dónde <font color='#D97706' size=8>(en 1 minuto)</font>", sH1))
story.append(Paragraph("Cada noche se crean <b>2 artefactos</b> por cliente:", sBody))
bullets1 = [
    "<b>Logical JSON</b> — foto limpia de tus datos (usuarios, contactos, tiendas, pedidos, auditoría) filtrada por tu empresa. Sirve para traer usuarios/contactos sin borrar nada. Lo crea Vercel y el MiniPC.",
    "<b>Physical pg_dump</b> — clon exacto de la base de datos (tablas, claves, secuencias). Solo lo crea el MiniPC porque Vercel no tiene <i>pg_dump</i>. Es el que te salva si hay que reconstruir todo.",
]
for b in bullets1:
    story.append(Paragraph(b, sBullet, bulletText="•"))

# Tabla retencion
story.append(Spacer(1,2*mm))
ret = [
    [Paragraph("<b>Destino</b>", sTableHeader), Paragraph("<b>Dónde vive</b>", sTableHeader), Paragraph("<b>Retención</b>", sTableHeader), Paragraph("<b>Si falla Vercel</b>", sTableHeader)],
    [Paragraph("<b>A  LOCAL</b>", sTableCell), Paragraph("Disco <b>/data/backups/palmerp</b> del MiniPC siempre ON", sTableCell), Paragraph("7 días<br/><font size=7>4 semanales aparte</font>", sTableCell), Paragraph("✅ Sigue guardando", sTableCell)],
    [Paragraph("<b>B  TU NUBE</b>", sTableCell), Paragraph("Tu propio bucket R2/S3 (tu cuenta)", sTableCell), Paragraph("30 días", sTableCell), Paragraph("✅ Sigue guardando (vía MiniPC)", sTableCell)],
    [Paragraph("<b>C  VAULT</b>", sTableCell), Paragraph("Vault central PalmerP (<b>vault/tenants/...</b>) inmutable", sTableCell), Paragraph("90 días<br/><font size=7>nunca borra el cliente</font>", sTableCell), Paragraph("✅ Sigue guardando", sTableCell)],
]
t_ret = Table(ret, colWidths=[28*mm, 62*mm, 32*mm, 48*mm])
t_ret.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), GRAPHITE),
    ("TEXTCOLOR", (0,0), (-1,0), white),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, GRAPHITE_ULTRA]),
    ("GRID", (0,0), (-1,-1), 0.4, HexColor("#E5E7EB")),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 4),
    ("RIGHTPADDING", (0,0), (-1,-1), 4),
    ("ROUNDEDCORNERS", [3,3,3,3]),
]))
story.append(t_ret)
story.append(Spacer(1,2*mm))
story.append(warning_box("Clave solo tuya", "El cifrado usa <b>solo tu BACKUP_ENCRYPTION_KEY</b>. PalmerP guarda un <b>.enc opaco</b> y <b>no puede abrirlo sin ti</b>. Si pierdes la clave, el backup es irrecuperable. Guarda la clave impresa (QR) en caja fuerte + en el NAS cifrado."))
story.append(Spacer(1,2*mm))
story.append(success_box("Tranquilidad", "Aunque Vercel y Supabase caigan, tienes 2 copias fuera de ellos (MiniPC + tu nube). El vault es el tercer seguro."))

# Cap 2
story.append(Paragraph("2 &nbsp; Antes de empezar: lo que necesitas", sH1))
story.append(Paragraph("Reúne esto en 5 minutos. Marca cada casilla:", sBody))
checks = [
    "Cuenta <b>Supabase</b> del cliente (URL pooler <i>6543 ?pgbouncer=true</i>) y <b>DATABASE_URL</b>",
    "Cuenta <b>Vercel</b> del cliente (proyecto importado desde GitHub fork)",
    "Cuenta <b>R2/S3</b> del cliente para destino B (ej. Cloudflare R2: Account ID + Access Key)",
    "Cuenta <b>R2</b> tuya para Vault C (separada, bucket <b>palmerp-vault</b>)",
    "MiniPC del cliente siempre encendido con <b>Ubuntu/Debian + Node 20 + pg_dump</b>",
    "Una clave de 32 bytes: genera con <b>openssl rand -base64 32</b> (44 caracteres)",
]
for c in checks:
    story.append(Paragraph(c, sBullet, bulletText="☐"))

story.append(Spacer(1,2*mm))
story.append(info_box("Genera la clave (una vez)", "En tu terminal:<br/><font face='Helvetica' color='#1F2937'><b>openssl rand -base64 32 | tr -d '\\n'</b></font><br/>Copia el resultado. Es tu <b>BACKUP_ENCRYPTION_KEY</b>. No la pongas en Git. Imprímela en QR y guárdala.", bg=HexColor("#EFF6FF"), border=BLUE))

# Cap 2b — Cloudflare R2 10GB gratis
story.append(Paragraph("2b &nbsp; Cloudflare R2 — 10 GB gratis, 0 € por descarga", sH1))
story.append(Paragraph("Tus backups B y C usan <b>Cloudflare R2</b> (<b>src/lib/storage.ts:3</b> + <b>storage-provider.ts:11</b> con <b>https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com</b>). R2 da <b>10 GB gratis + 10M operaciones/mes + 0 € egress</b> (AWS S3 cobra). 2-10 MB/noche × 90 días = 0,2-0,9 GB → gratis. Necesitas 2 buckets: <b>cliente-backups</b> (B, en cuenta del cliente, 30d) y <b>palmerp-vault</b> (C, en tu cuenta, 90d inmutable).", sBody))
story.append(Paragraph("Paso 1 — Cuenta Cloudflare (2 min)", sH2))
story.append(Paragraph("Ve a <b>https://dash.cloudflare.com/sign-up</b> → email + password → verifica. Plan <b>Free 0 €</b>. Copia tu <b>Account ID</b> (arriba derecha, URL <b>.../accounts/&lt;ACCOUNT_ID&gt;</b>). Para R2 te pedirá añadir tarjeta pero no cobra los 10 GB.", sBody))
story.append(Paragraph("Paso 2 — Activa R2 y crea buckets (2 min)", sH2))
story.append(Paragraph("Menú <b>R2 Object Storage → Enable R2 → Create bucket</b> dos veces:<br/>• Cliente (B): Name <b>cliente-backups</b>, Location Automatic → Create<br/>• Vault (C) en tu cuenta: Name <b>palmerp-vault</b>, Location Automatic<br/>En cada bucket → Settings → <b>Public access: Not public</b> (backups nunca públicos).", sBody))
story.append(Paragraph("Paso 3 — API Tokens R2 (2 min por cuenta)", sH2))
story.append(Paragraph("R2 → <b>Manage R2 API Tokens → Create API Token</b> → Name <b>palmerp-backup-cliente-x</b> → Permissions <b>Admin</b> (o Object Read & Write) → TTL Forever → Create → copia <b>Access Key ID</b> (32 chars) y <b>Secret Access Key</b> (64 hex) — <b>no se vuelven a mostrar</b>.<br/>Guarda: <b>R2_ACCOUNT_ID</b> (Account ID) + <b>R2_ACCESS_KEY_ID</b> + <b>R2_SECRET_ACCESS_KEY</b> + <b>R2_BUCKET_NAME</b>. Repite para vault.", sBody))
story.append(Paragraph("Paso 4 — Rellena .env y prueba", sH2))
story.append(Paragraph("En <b>Vercel Env + MiniPC .env</b>:<br/><font face='Helvetica' size=7>CLIENT_BACKUP_S3_ENDPOINT=\"https://&lt;ACCOUNT_ID_CLIENTE&gt;.r2.cloudflarestorage.com\"<br/>CLIENT_BACKUP_S3_BUCKET=\"cliente-backups\"<br/>PALMERP_VAULT_R2_ACCOUNT_ID=\"&lt;ACCOUNT_ID_TUYO&gt;\"<br/>PALMERP_VAULT_R2_BUCKET_NAME=\"palmerp-vault\"</font><br/>Prueba: <b>npm run backup:agent</b> debe decir <b>[CLIENT_STORAGE] uploaded</b> y <b>[VAULT] uploaded</b> (no <i>not configured</i>). R2 → Overview verás <b>Storage: 10 GB / 10 GB Free</b>.", sBody))
story.append(success_box("Gratis de verdad", "Tus .enc son céntimos en R2. Si un millón descarga un módulo, tu factura egress es 0 € — por eso <b>hosting_and_business_strategy.md:113</b> recomienda R2."))

# Cap 3
story.append(Paragraph("3 &nbsp; Instalación paso a paso <font color='#D97706' size=8>(15 min)</font>", sH1))
story.append(Paragraph("Sigue en orden. Si un paso falla, no avances.", sH2))

story.append(step_table(1, "Clona el núcleo desde GitHub", "Crea el proyecto del cliente a partir del repo base <b>palmerp</b> (template). Así Vercel detectará cada <b>push a main</b> y desplegará solo.", "git clone https://github.com/tu/palmerp.git cliente-x && cd cliente-x"))
story.append(step_table(2, "Configura .env.local y Vercel Env", "Copia <b>.env.example → .env.local</b> y rellena. Luego replica las mismas vars en <b>Vercel → Settings → Environment Variables</b> (Production).", "cp .env.example .env.local  # edita DATABASE_URL, NEXTAUTH_SECRET, BACKUP_ENCRYPTION_KEY, ..."))
# Env table
env_rows = [
    [Paragraph("<b>Variable</b>", sTableHeader), Paragraph("<b>Ejemplo</b>", sTableHeader), Paragraph("<b>Dónde</b>", sTableHeader)],
    [Paragraph("DATABASE_URL", sTableCell), Paragraph("postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true", sTableCell), Paragraph("Supabase cliente", sTableCell)],
    [Paragraph("NEXTAUTH_URL", sTableCell), Paragraph("https://cliente.vercel.app", sTableCell), Paragraph("Vercel dominio", sTableCell)],
    [Paragraph("NEXTAUTH_SECRET", sTableCell), Paragraph("openssl rand -base64 32", sTableCell), Paragraph("Vercel", sTableCell)],
    [Paragraph("BACKUP_ENCRYPTION_KEY", sTableCell), Paragraph("44 chars base64 (tu clave)", sTableCell), Paragraph("Vercel + MiniPC", sTableCell)],
    [Paragraph("BACKUP_LOCAL_DIR", sTableCell), Paragraph("/data/backups/palmerp", sTableCell), Paragraph("MiniPC", sTableCell)],
    [Paragraph("CLIENT_BACKUP_S3_*", sTableCell), Paragraph("Endpoint + Bucket + Keys R2 cliente", sTableCell), Paragraph("Vercel + MiniPC", sTableCell)],
    [Paragraph("PALMERP_VAULT_R2_*", sTableCell), Paragraph("Vault PalmerP (tu R2)", sTableCell), Paragraph("Vercel + MiniPC", sTableCell)],
    [Paragraph("CRON_SECRET / FLEET_API_KEY", sTableCell), Paragraph("Bearer token aleatorio", sTableCell), Paragraph("Vercel + MiniPC", sTableCell)],
]
t_env = Table(env_rows, colWidths=[42*mm, 78*mm, 50*mm])
t_env.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), GRAPHITE),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, GRAPHITE_ULTRA]),
    ("GRID", (0,0), (-1,-1), 0.4, HexColor("#E5E7EB")),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 3),
    ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ("LEFTPADDING", (0,0), (-1,-1), 4),
]))
story.append(t_env)
story.append(Spacer(1,2*mm))
story.append(info_box("No subas .env a Git", "El <b>.gitignore</b> ya ignora <b>.env*</b>. Verifica con <b>git status</b> que no aparece. Las claves solo viven en Vercel Env y en el MiniPC.", bg=AMBER_LIGHT, border=AMBER))

story.append(step_table(3, "Inicializa base de datos", "Crea tablas y usuario admin del tenant.", "npx prisma migrate deploy  &&  npm run instance:provision -- --slug cliente-x --name \"Cliente X SL\" --admin-email admin@cliente.es"))
story.append(step_table(4, "Conecta Vercel a GitHub", "En Vercel → <b>Add New Project → Import from GitHub</b> selecciona el fork del cliente. Production Branch = <b>master</b>. Cada <b>git push origin master</b> desplegará auto.", "git push origin master  # verifica en Vercel → Deployments que sale verde"))
story.append(step_table(5, "Verifica el cron 02:30", "Vercel ya tiene <b>vercel.json → crons: 30 2 * * *</b>. Comprueba en Vercel → Settings → Cron Jobs que aparece <b>/api/cron/daily-backups</b>. No toques la hora.", None))
story.append(step_table(6, "Prueba un backup manual", "Lanza un backup sin esperar a las 02:00. Debe devolver <b>success/partial</b> con 3 destinos.", 'curl -H "Authorization: Bearer $CRON_SECRET" https://cliente.vercel.app/api/cron/daily-backups'))
story.append(success_box("¿Todo verde?", "Si el JSON trae <b>\"overallStatus\": \"success\"</b> y ves 3 destinos OK, ya duermes tranquilo. Si sale <b>\"not configured\"</b> en algún destino, revisa ese bloque de vars."))

# Cap 4
story.append(Paragraph("4 &nbsp; El MiniPC: agente local 02:00", sH1))
story.append(Paragraph("El cerebro local + el guardián del backup físico. Siempre encendido.", sBody))
story.append(Paragraph("Por qué hace falta", sH2))
story.append(Paragraph("Vercel no tiene <b>pg_dump</b>, así que solo puede guardar el JSON. El MiniPC sí crea el <b>.physical.sql.gz.enc</b> (clon exacto) y además es tu copia A local que no depende de internet. Si Vercel cae a las 02:00, el MiniPC igualmente guarda en los 3 sitios.", sBody))
story.append(Paragraph("Instalación en 5 minutos", sH2))
story.append(step_table(1, "Prepara el MiniPC", "Ubuntu/Debian, Node 20+, pg_dump, disco con espacio.", "sudo apt update && sudo apt install -y nodejs postgresql-client && node -v && pg_dump --version"))
story.append(step_table(2, "Clona y configura", "Mismo repo + mismo .env que Vercel (copia las vars).", "git clone https://github.com/tu/palmerp.git /opt/palmerp && cd /opt/palmerp && npm ci --legacy-peer-deps && cp .env.example .env"))
story.append(step_table(3, "Prueba manual", "Debe crear <b>/data/backups/palmerp/tenants/.../daily/*.enc</b> y subir a B y C.", "npm run backup:agent  # o node scripts/backup-agent.mjs --once"))
story.append(step_table(4, "Automatiza a las 02:00", "Systemd timer es más fiable que cron.", "sudo cp scripts/systemd/palmerp-backup.* /etc/systemd/system/  # ver nota abajo\nsudo systemctl daemon-reload && sudo systemctl enable --now palmerp-backup.timer\nsystemctl list-timers | grep palmerp"))
story.append(info_box("Systemd si no tienes los archivos", "Crea tú <b>/etc/systemd/system/palmerp-backup.service</b> con <b>ExecStart=/usr/bin/node /opt/palmerp/scripts/backup-agent.mjs --once</b> y <b>palmerp-backup.timer</b> con <b>OnCalendar=02:00</b>. El script ya está en <b>scripts/backup-agent.mjs:1</b>.", bg=HexColor("#EFF6FF"), border=BLUE))
story.append(Paragraph("Qué hace cada noche", sH2))
story.append(Paragraph("1) Lee tu Supabase directo (no Vercel) → 2) gzip → 3) cifra solo con tu clave → 4) sha256 → 5) escribe <b>LOCAL</b> + sube <b>CLIENT_STORAGE</b> + <b>VAULT</b> → 6) escribe <b>BackupLog</b> + <b>AuditLog BACKUP_HEARTBEAT</b> → 7) borra lo de 7/30 días (vault nunca).", sBody))

# Cap 5
story.append(Paragraph("5 &nbsp; Comprobar cada mañana <font color='#D97706' size=8>(1 minuto)</font>", sH1))
story.append(Paragraph("No necesitas abrir 3 nubes. Mira un solo semáforo.", sBody))
sema = [
    [Paragraph("<b>Color</b>", sTableHeader), Paragraph("<b>Significa</b>", sTableHeader), Paragraph("<b>Qué hacer</b>", sTableHeader)],
    [Paragraph("<font color='#059669'>● Verde</font>", sTableCell), Paragraph("Backup <b>&lt;24h</b> OK en 3 destinos", sTableCell), Paragraph("Nada. ✅", sTableCell)],
    [Paragraph("<font color='#D97706'>● Amarillo</font>", sTableCell), Paragraph("Backup 24-48h o solo 2 destinos", sTableCell), Paragraph("Revisa vars del destino fallido, lanza backup manual.", sTableCell)],
    [Paragraph("<font color='#DC2626'>● Rojo</font>", sTableCell), Paragraph("Backup >48h o fallido", sTableCell), Paragraph("Actúa hoy: revisa MiniPC encendido, credenciales R2, logs.", sTableCell)],
]
t_sema = Table(sema, colWidths=[30*mm, 60*mm, 80*mm])
t_sema.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), GRAPHITE),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, GRAPHITE_ULTRA]),
    ("GRID", (0,0), (-1,-1), 0.4, HexColor("#E5E7EB")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story.append(t_sema)
story.append(Spacer(1,3*mm))
story.append(Paragraph("Dónde mirar", sH2))
story.append(Paragraph("Opción A - Superadmin (tú): <b>GET /api/fleet/backup-heartbeat</b> → JSON con <b>status[] {slug, lastBackupAt, ageHours, color}</b>. Monta un dashboard sencillo con esos colores.<br/>Opción B - Cliente: <b>GET /api/admin/restore?tenantId=...</b> lista últimos <b>BackupLog</b> o entra por SSH al MiniPC y mira <b>ls -lh /data/backups/palmerp</b>.", sBody))
story.append(Paragraph("Comando rápido", sH3))
story.append(Paragraph('curl -H "Authorization: Bearer $FLEET_API_KEY" https://control.palmerp.es/api/fleet/backup-heartbeat | jq .status', sCode))
story.append(Paragraph("Log diario", sH3))
story.append(Paragraph("Cada backup escribe <b>BackupLog</b> (tenantId, destination, fileKey, checksum, size, encrypted, status) y <b>AuditLog BACKUP_RUN / BACKUP_HEARTBEAT</b>. Si ves <b>PARTIAL</b> es que algún destino falló pero al menos uno guardó.", sBody))

# Cap 6
story.append(Paragraph("6 &nbsp; Restaurar: cuando algo sale mal", sH1))
story.append(warning_box("Antes de restaurar", "Para y respira: <b>no sobrescribas sin dryRun</b>. Prueba primero en local. El restore lógico <b>nunca borra</b>, solo añade usuarios/contactos que faltan. El físico sí reconstruye todo."))
story.append(Paragraph("Caso 1 - Recuperar un usuario/contacto borrado (lógico)", sH2))
story.append(step_table(1, "Lista backups", "Elige el .logical.json.gz.enc de ayer.", "curl \"https://cliente.vercel.app/api/admin/restore?tenantId=xxx\" | jq .logs[0]"))
story.append(step_table(2, "Descarga el .enc", "Bájalo de donde prefieras: <b>MiniPC</b> <i>/data/backups</i>, tu <b>R2 cliente</b>, o <b>Vault</b> <i>vault/tenants/...</i>. Cópialo a tu portátil.", "scp mini:/data/backups/palmerp/tenants/xxx/daily/2026-09-14.logical.json.gz.enc ./"))
story.append(step_table(3, "Verifica (dryRun)", "Descifra con tu clave y valida sin tocar base de datos.", "curl -X POST https://cliente.vercel.app/api/admin/restore -H \"Content-Type: application/json\" -d '{\"tenantId\":\"xxx\",\"fileKey\":\"tenants/xxx/daily/...logical.json.gz.enc\",\"encBase64\":\"...base64...\",\"dryRun\":true}' | jq .preview"))
story.append(step_table(4, "Restaura", "Mismo POST con <b>dryRun:false</b> → crea usuarios/contactos faltantes.", "dryRun:false  # revisa respuesta {restoredUsers}"))
story.append(Paragraph("Caso 2 - Reconstruir toda la base (físico)", sH2))
story.append(Paragraph("Solo con el artefacto <b>.physical.sql.gz.enc</b> del MiniPC/Vault. Pasos en tu portátil con la clave:", sBody))
story.append(Paragraph("1) Descifra (usa <b>src/lib/backup/crypto.ts:decryptBuffer</b> o script) → 2) <b>gunzip</b> → 3) <b>psql \"$DATABASE_URL\" &lt; dump.sql</b><br/>Nunca lo hagas en producción sin parar la app y avisar al cliente. Hazlo primero en staging.", sBody))
story.append(Paragraph("Desencriptado manual (si no quieres API)", sH3))
story.append(Paragraph("El formato es <b>iv 12B | tag 16B | ciphertext</b> AES-GCM. Usa el helper <b>decryptBuffer</b> de <b>src/lib/backup/crypto.ts:1</b> o el snippet de <b>scripts/backup-agent.mjs:1</b> (función <i>resolveKey</i>). Sin la clave da error <i>auth failed</i> — es normal.", sBody))
story.append(info_box("Physical requiere MiniPC", "Si solo ves <b>logical</b> en Vercel, es normal: Vercel no genera físico. Busca el <b>physical</b> en el MiniPC o en el Vault tras la noche que el agente corrió.", bg=TEAL_LIGHT, border=TEAL))

# Cap 7
story.append(Paragraph("7 &nbsp; Fleet: cómo gestionas tú las instancias", sH1))
story.append(Paragraph("Cada cliente tiene su Vercel + Supabase + GitHub + MiniPC. Tú no tocas su base de datos, pero ves salud.", sBody))
story.append(Paragraph("Modelo Fleet independiente", sH2))
story.append(Paragraph("Repo base <b>palmerp</b> es <b>template</b>. Cliente hace <b>fork/clone</b> → importa en su Vercel. Tu repo base es <b>upstream</b>: <b>git remote add upstream https://github.com/tu/palmerp.git</b> → <b>git fetch upstream && git merge upstream/master</b> → <b>git push origin master</b> → Vercel del cliente despliega solo. Cada modo nuevo se instala desde repo base vía <b>POST /api/admin/modes/install</b> (manifiesto <b>registry.json</b>).", sBody))
f1 = [
    [Paragraph("<b>Tú controlas</b>", sTableHeader), Paragraph("<b>Cliente controla</b>", sTableHeader)],
    [Paragraph("Vault central inmutable 90d<br/>Heartbeat/semáforo fleet", sTableCell), Paragraph("Su R2/S3, su Supabase, su MiniPC, su clave", sTableCell)],
    [Paragraph("Repo base + manifiesto modos", sTableCell), Paragraph("Su fork + su Vercel deploy auto", sTableCell)],
    [Paragraph("Soporte + updates upstream", sTableCell), Paragraph("Coste Vercel/Supabase lo paga él directo", sTableCell)],
]
t_f1 = Table(f1, colWidths=[85*mm, 85*mm])
t_f1.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GRAPHITE),("ROWBACKGROUNDS",(0,1),(-1,-1),[white,GRAPHITE_ULTRA]),("GRID",(0,0),(-1,-1),0.4,HexColor("#E5E7EB")),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
story.append(t_f1)
story.append(Spacer(1,3*mm))
story.append(Paragraph("Gestión sin invadir", sH2))
story.append(Paragraph("Cada instancia hace <b>POST /api/fleet/backup-heartbeat</b> cada noche (agente o cron). Tú montas un dashboard que consume <b>GET /api/fleet/backup-heartbeat</b> y pinta el semáforo. Si quieres acceso delegado, que te añada como <b>Member</b> en su Vercel Team / Supabase Org (no necesitas su DATABASE_URL para ver salud).", sBody))
story.append(info_box("Costes claros", "El cliente paga su Vercel + Supabase + R2 directo. Tú pagas solo el Vault central (un bucket R2). Margen alto, sin sorpresas.", bg=AMBER_LIGHT, border=AMBER, icon="💰"))

# Cap 8
story.append(Paragraph("8 &nbsp; Preguntas frecuentes", sH1))
faqs = [
    ("¿Y si pierdo la BACKUP_ENCRYPTION_KEY?", "No hay vuelta atrás: el .enc no se abre. Por eso la generas una vez, la copias en <b>Vercel Env + MiniPC .env + papel QR en caja fuerte + NAS cifrado</b>. Haz copia ya."),
    ("¿Por qué dos artefactos?", "El <b>logical</b> es ligero y sirve para recuperar usuarios/contactos sin parar nada. El <b>physical</b> es el salvavidas total. Con ambos duermes tranquilo."),
    ("¿Puedo cambiar la hora de 02:00?", "Sí, edita <b>vercel.json → crons 30 2 * * *</b> y el <b>systemd timer OnCalendar</b> del MiniPC. Mantén ambos iguales."),
    ("¿Cuánto ocupa?", "JSON gzip ~90% menos. Un negocio medio: logical 2-10 MB cifrado, physical 10-100 MB. En R2 90 días son céntimos."),
    ("¿Y si el MiniPC se apaga?", "Has confirmado que estará siempre ON. Si se apaga, esa noche solo tendrás logical en Vercel (amarillo). Al encender, el agente retoma a las 02:00 siguiente."),
    ("¿Cómo sé que el backup es bueno?", "El runner hace <b>gzip → encrypt → sha256</b> y guarda <b>BackupLog.checksum</b>. El restore dryRun descifra y valida JSON. El Vault es inmutable, nadie lo borra."),
    ("¿PalmerP puede ver mis datos?", "No. El vault guarda <b>.enc opaco</b>. Sin tu clave no hay descifrado. Ni siquiera con acceso al bucket."),
]
for q,a in faqs:
    story.append(Paragraph(f"<b>{q}</b>", ParagraphStyle("Q", parent=sBody, fontName="Helvetica-Bold", fontSize=9, textColor=GRAPHITE, spaceBefore=3*mm, spaceAfter=1*mm)))
    story.append(Paragraph(a, sBody))

story.append(Spacer(1,6*mm))
story.append(HRFlowable(width="100%", thickness=0.8, color=AMBER))
story.append(Paragraph("Checklist final: pégalo en la pared ✅", ParagraphStyle("CheckTitle", parent=sH1, fontSize=14, textColor=GRAPHITE)))
check_final = [
    "☐  <b>Clave</b> generada y guardada en 4 sitios (Vercel, MiniPC, papel QR, NAS)",
    "☐  <b>Vercel cron 02:30</b> visible en dashboard + <b>systemd timer 02:00</b> activo",
    "☐  <b>Backup manual</b> probado: 3 destinos success, 2 artefactos (logical siempre, physical en MiniPC)",
    "☐  <b>Semáforo</b> verde &lt;24h en <b>/api/fleet/backup-heartbeat</b>",
    "☐  <b>Restore dryRun</b> probado con un .enc real",
    "☐  <b>Vault</b> con lifecycle 90d inmutable, <b>CLIENT_STORAGE</b> 30d, <b>LOCAL</b> 7d",
]
for c in check_final:
    story.append(Paragraph(c, sBullet, bulletText=""))

story.append(Spacer(1,4*mm))
story.append(Paragraph("¿Dudas? Escríbenos. Si este manual te ha dado tranquilidad, ha cumplido su misión. 🌙", ParagraphStyle("Outro", parent=sBody, alignment=TA_CENTER, fontSize=10, textColor=GRAPHITE_LIGHT)))
story.append(Spacer(1,2*mm))
story.append(Paragraph("PalmerP  •  Hecho con mimo en Europa  •  2026", ParagraphStyle("FooterQuote", parent=sCaption, fontSize=7)))

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f"PDF generado: {OUT} ({os.path.getsize(OUT)} bytes)")
