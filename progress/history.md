# Historial de Sesiones — Palmera Core

> Bitácora persistente de sesiones de desarrollo completadas. Aquí se añaden las entradas acumulativas de `progress/current.md` al cerrar cada sesión.

---

## [2026-05-17] Inicialización del Arnés de Ingeniería

**Objetivo:** Establecer la infraestructura de Harness Engineering en el repositorio `palm` fusionándolo con las directrices de `plantilla harness` y adaptándolo a Next.js, React, Tailwind CSS v4 y Prisma.

### Logros
1. **Infraestructura de Orquestación**: Configurado `CLAUDE.md` con el rol de `leader` para prevenir el teléfono descompuesto.
2. **Definición de Subagentes**: Creadas las directrices para `leader`, `implementer` y `reviewer` bajo `.claude/agents/`.
3. **Control Automático**: Añadido `.claude/settings.json` para ejecutar `npx tsc` (comprobador de tipos) tras cada edición de archivos.
4. **Documentación del Core**: Redactados los archivos `architecture.md`, `conventions.md` y `verification.md` para Next.js, estableciendo directrices de desarrollo modular limpio (Alternativa B).
5. **Calidad de Entrega**: Diseñado `CHECKPOINTS.md` para validación estricta.
6. **Plan de Ruta**: Diseñado `feature_list.json` con las 6 tareas atómicas iniciales para construir el Core modular standalone (CRM, Auth, Messages, Apps).

**Estado:** Arnés desplegado con éxito. Listo para la primera ejecución de verificación (`init.sh`).

---

## [2026-05-17] Feature #1 — Inicialización de Prisma y Esquema Base (db_schema)

**Objetivo:** Configurar Prisma y definir el esquema relacional básico agnóstico del core del ERP (User, PasswordResetToken, Contact, Setting, AuditLog) adaptado al estándar de **Prisma 7**.

### Cambios Realizados
1. **Nuevas Dependencias**: Instalados `prisma` (devDependency) y `@prisma/client`, `@prisma/adapter-pg`, `pg` y `dotenv` (dependencies) para soportar el nuevo modelo de driver adapters TCP de Prisma 7.
2. **Esquema de Base de Datos (`prisma/schema.prisma`)**: Diseñados los modelos agnósticos desacoplados del negocio de restaurantes de Gastroshows:
   - `User`: Administradores y Staff general de la empresa (roles `ADMIN` y `STAFF`).
   - `PasswordResetToken`: Gestión de recuperación de contraseñas integrada en NextAuth.
   - `Contact`: Ficha CRM centralizada de clientes y empresas (particular/empresa, CIF/NIF, direcciones de facturación).
   - `Setting`: Parámetros clave-valor dinámicos para configuración global y activación de módulos.
   - `AuditLog`: Registro seguro de operaciones críticas empresariales.
3. **Arquitectura Prisma 7 (`prisma.config.ts`)**: Creado el archivo de mapeo de entorno en la raíz del proyecto para definir la conexión URL.
4. **Driver Adapter Singleton (`src/lib/db.ts`)**: Rediseñado el inicializador global para usar `pg.Pool` and `PrismaPg`, evitando la saturación de conexiones en el modo de desarrollo de Next.js hot-reloading.
5. **Verificación de Entorno**: Validado mediante `./init.ps1` en PowerShell nativo, logrando una compilación estricta de tipos de TypeScript 100% limpia y exitosa (exit code 0).

**Estado:** Feature #1 completada y aprobada por el revisor.

---

## [2026-05-17] Feature #2 — Diseño del UI Shell Base (layout_shell)

**Objetivo:** Crear el Layout Administrativo con Sidebar (navegación dinámica según módulos activos) y TopBar (perfil, búsqueda e idioma), y soportar modo oscuro/claro interactivo premium y responsive.

### Cambios Realizados
1. **Instalación de Iconos**: Instalada la dependencia `lucide-react` para contar con iconos vectoriales consistentes y nítidos.
2. **Abstracción Modular (`src/types/core.ts` & `src/modules/registry.ts`)**: Creadas las interfaces del Core y el registro estático inicial con nuestros 3 módulos core (`Contactos`, `Conversaciones`, `Ajustes`).
3. **Diseño de Colores Premium (`src/app/globals.css`)**: Definidos tokens de diseño HSL basados en grafito y ámbar cálido para un look extremadamente sofisticado y vidrio esmerilado (`glassmorphism`). Soporte de Dark Mode manual mediante la inyección suave de la clase `.dark` en el nodo raíz de HTML.
4. **Componentes del Shell**:
   - `AdminSidebar.tsx`: Menú lateral que lee dinámicamente el registro, maneja acordeones colapsables para sub-rutas, micro-animaciones al pasar el cursor y un avatar mockeado.
   - `AdminTopbar.tsx`: Barra de navegación superior con el título dinámico de la página, buscador de transacciones, switcher de idioma, notificaciones y un **alternador de modo oscuro** completamente funcional y persistente en `localStorage`.
   - `AdminLayout.tsx`: Contenedor principal que ajusta los márgenes e integra el sidebar responsive y el topbar.
5. **Next.js App Router layout (`src/app/admin/layout.tsx`)**: Expone el layout administrativo global a nivel de ruteo con meta-etiquetas amigables para SEO.
6. **Dashboard Index (`src/app/admin/page.tsx`)**: Panel de control interactivo de primer nivel (Wow Effect) que muestra métricas simuladas de contactos y mensajes, widgets de diagnóstico en tiempo real (uso de heap, latencia) y feeds del log de auditoría.
7. **Verificación del Arnés**: Corregidos typos menores de iconos Lucide (`Palmtree`) detectados por el compilador, logrando una verificación strict de TypeScript 100% exitosa mediante `./init.ps1`.

**Estado:** Feature #2 completada y aprobada por el revisor.

---

## [2026-05-17] Feature #4 — Ficha CRM de Contactos (contact_crm)

**Objetivo:** Crear la interfaz completa Odoo-inspired para administración de contactos (clientes, proveedores, leads) con ordenación en columnas, buscador funcional, filtros avanzados y agregación por lotes.

### Cambios Realizados
1. **Interfaz CRM Odoo-like (`src/app/admin/contacts/page.tsx`)**: Diseñada una página de control interactiva y sofisticada:
   - **Buscador de Texto Completo**: Busca en tiempo real coincidencias por nombre, email, CIF o ciudad.
   - **Filtros Odoo**: Filtros con un clic para "Solo Empresas", "Solo Particulares" e "Identificación (CIF)".
   - **Agrupamiento Dinámico**: Acordeones colapsables Odoo-style para clasificar los registros según Tipo de Contacto (Empresas/Particulares) o por Ciudad.
   - **Ordenación Bidireccional**: Al hacer clic en las cabeceras de Nombre, Email, Tipo de Contacto y CIF, se alterna de menor a mayor (`asc`) y de mayor a menor (`desc`), mostrando indicadores visuales claros.
   - **Modal e Inputs Completos**: Administra Nombre, Tipo (Particular/Empresa), Email, Teléfono, CIF/NIF, Empresa Vinculada, Dirección de Facturación Completa (Calle, CP, Ciudad, País) y Notas de interés.
   - **Botón de "+" en Celda Requerida**: Ubicado con precisión en la **última celda horizontal de la primera fila vertical (fila de encabezado, última columna)**. De tamaño mediano y color ámbar con hover dinámico y tooltip, abre instantáneamente el formulario.
2. **Persistencia Dinámica**: Sincronización automática de todas las inserciones, ediciones y eliminaciones en el `localStorage` del cliente, manteniendo la información persistente entre recargas de página y ofreciendo un botón para recargar datos de prueba de Odoo en caliente.
3. **Verificación de Tipos**: Compilado y aprobado en verde (exit code 0) bajo `./init.ps1`.

**Estado:** Feature #4 completada y aprobada por el revisor.

---

## [2026-05-17] Personalización de Interfaz en Caliente (live_customizer)

**Objetivo:** Crear un sistema premium de personalización visual en tiempo real que permita a los administradores renombrar etiquetas estáticas de la interfaz (como encabezados de tabla o menús del sidebar) con persistencia en localStorage y anulación selectiva de eventos nativos en pausa.

### Cambios Realizados
1. **Contexto de Personalización (`src/context/CustomizerContext.tsx`)**: Almacena el diccionario clave-valor de etiquetas personalizadas y la bandera global `isCustomizerActive`, sincronizándolo con `localStorage` (`palmera_custom_ui_texts`).
2. **Componente de Intercepción Inteligente (`src/components/admin/EditableLabel.tsx`)**:
   - En modo normal, actúa como texto estático común.
   - En modo customizer, añade una sutil línea de puntos dorada y un puntero de edición. Al hacer clic, **intercepta completamente el evento** (`e.stopPropagation()` and `e.preventDefault()`), impidiendo acciones nativas del padre (como la ordenación de columnas o la navegación en el sidebar) para abrir en su lugar un campo de texto *inline* ultra fluido con botones de confirmar/cancelar.
3. **Integración en Shell (`src/components/admin/AdminLayout.tsx`)**:
   - Inyecta el botón de activación en la **esquina inferior izquierda (fixed bottom-6 left-6)** con efectos tridimensionales.
   - Cuando el modo está activo, dibuja una viñeta/borde dorado con pulso de pausa y un aviso flotante de alta gama en la parte superior.
4. **Envoltura de Elementos Clave**:
   - **Sidebar**: Nombre de marca ("Palmera"), categorías y enlaces a módulos individuales.
   - **Tabla CRM**: Cabeceras de columna (Nombre, Email, Teléfono, Tipo, CIF/NIF, Ciudad) y títulos principales de la página.
5. **Verificación**: Validado en verde (exit code 0) mediante `./init.ps1`.

**Estado:** Módulo de personalización visual en caliente completado y aprobado con honores.

---

## [2026-05-17] Despachador de E-mails Inteligente con Plantilla (smart_email_dispatcher)

**Objetivo:** Crear un despachador visual de correos electrónicos en el CRM que resuelva dinámicamente saludos personalizados y plantillas operativas ("Casual: Hey...", "Operaciones: Querida Silvia...") dependiendo de las directrices y cercanía con el contacto.

### Cambios Realizados
1. **Extendida Ficha del Contacto**: Añadido el atributo de base `customGreeting` al modelo de datos y a su formulario en el CRUD.
2. **Semilla de Datos Semánticos**: Pre-poblados los saludos estrella en los contactos mock:
   - **Renato García**: `"Hey"` (Hermano/Amigo - *"Hey, mañana tienes..."*).
   - **Lucía Fernández**: `"Querida Silvia"` (Directora de operaciones - *"Querida Silvia, necesito..."*).
3. **Fidelidad Visual (Envelope Trigger)**: Renderizado un icono de sobre (`Mail`) de Lucide justo al lado del texto del e-mail en cada fila del listado.
4. **Panel de Despacho CRM**:
   - Muestra detalles de "De" (admin) y "Para" (contacto).
   - Ofrece un intercambiador interactivo de plantillas operativas de un clic ("Casual", "Operaciones", "En Blanco").
   - Resuelve el cuerpo del mensaje combinando el saludo y el texto de la plantilla.
5. **Métricas y Logs de Auditoría**: Al hacer clic en "Enviar", inicia un loader animado y escribe el evento en el almacén persistente de auditoría (`AuditLog`) para visualización en los paneles del administrador. Muestra un toast flotante en color verde esmerilado al finalizar.
6. **Verificación**: Validado en verde (exit code 0) mediante `./init.ps1`.

**Estado:** Despachador de e-mails inteligente CRM completado y aprobado.

---

## [2026-05-17] Despachador Telefónico y de WhatsApp con Plantillas (phone_whatsapp_dispatcher)

**Objetivo:** Crear un hub de comunicación multicanal integrado en el CRM que emule llamadas telefónicas interactivas y facilite el envío de mensajes por WhatsApp Web aplicando saludos personalizados en caliente.

### Cambios Realizados
1. **Inyección en Fila (Hover Action Triggers)**: Colocados dos botones de acción Lucide (`PhoneCall` en ámbar y `MessageCircle` en esmeralda) junto a los números de teléfono, visibles elegantemente al pasar el cursor sobre la fila.
2. **Selector de Canal Unificado (Modal Tabs)**: Diseñado un modal con tabs superiores para alternar rápidamente entre Llamada Telefónica y Redacción de WhatsApp.
3. **Pantalla Interactiva de Voz (CALL)**:
   - Pantalla de marcación con un icono de teléfono pulsando visualmente.
   - **Temporizador en Tiempo Real**: Inicia un contador de segundos activo (`setInterval`) cuando progresa la llamada ficticia.
   - Botón de Colgar en color rojo que detiene la llamada, calcula la duración exacta y crea un ticket de llamada técnica en el `AuditLog` del sistema.
4. **Despachador Inteligente de WhatsApp**:
   - Integra las plantillas rápidas **Casual (Hey...)** y **Operaciones (Silvia...)** alineadas con las preferencias del contacto.
   - Al pulsar "Enviar WhatsApp", limpia el número de teléfono de caracteres extraños y realiza un `window.open` a la pasarela oficial de WhatsApp (`api.whatsapp.com/send`) pre-llenando la conversación del destinatario de manera real.
5. **Verificación**: Validado en verde (exit code 0) mediante `./init.ps1`.

**Estado:** Despachador multicanal de telefonía y WhatsApp completado y aprobado.

---

## [2026-05-17] Panel de Usuarios con 3 Roles y Estética Metalizada Premium (user_access_settings)

**Objetivo:** Implementar la consola de Ajustes de Usuarios y Roles de tres niveles (`DEV`, `ADMIN`, `USUARIO`), diseñar las vistas secundarias de configuración general y módulos, e integrar la estética tipográfica sofisticada con Outfit y gradientes metálicos.

### Cambios Realizados
1. **Submenú "Usuarios & Permisos"**: Registrada la nueva opción de ruteo modular en `src/modules/registry.ts` dentro de la categoría de Ajustes.
2. **Dashboard de Usuarios (`src/app/admin/settings/users/page.tsx`)**:
   - Diseñada una grilla de control CRUD Odoo-like interactiva y sofisticada.
   - **Roles Definidos**: `DEV` (badge rosa/rojo), `ADMIN` (badge ámbar), y `USUARIO` (badge azul).
   - **Tarjeta Dinámica de Alcance**: Al alternar el rol de acceso en el formulario modal, una caja de diagnóstico expone exactamente qué tiene permitido realizar el usuario (ej: Developer accede a código strict y logs en crudo; Admin a ajustes corporativos; Usuario a CRM básico).
   - **Persistencia en LocalStorage (`palmera_users`)**: Se inicializa con tres cuentas de prueba estructuradas (`dev@palmera.io`, `renato@palmera.io`, `silvia@palmera.io`).
   - **Auditoría e Historial**: Las operaciones de creación, edición y cambio de rol disparan notificaciones Toast y registran tickets específicos en `AuditLog`.
3. **Ajustes Generales y Módulos**:
   - Creado `src/app/admin/settings/page.tsx` para administrar razón social, emails del sistema, huso horario y modo de mantenimiento.
   - Creado `src/app/admin/settings/modules/page.tsx` para habilitar/desactivar en tiempo real las aplicaciones corporativas con persistencia local.
4. **Estética Metálica y Tipografía Outfit**:
   - **Outfit Font**: Importada de manera Spec-compliant en la primera línea de `src/app/globals.css` (resolviendo la regla estricta de imports de PostCSS en Turbopack) y configurada como tipografía corporativa de la plataforma para un look limpio y profesional.
   - **Gradient Metal Pulido**: Definida la clase `.bg-metallic-orange` que recrea el reflejo de bronce y cobre pulido mediante gradientes multi-estadio, sombras difusas y biselados internos de luz. Aplicada al logotipo de `AdminSidebar` y a todos los botones principales de interacción de usuarios y CRM.
5. **Verificación de Entorno**: Verificado todo el árbol de compilación strict de Next.js mediante `./init.ps1`, culminando con **0 errores y compilación 100% limpia en verde**.

**Estado:** Panel de Usuarios y Estética Metálica completada con éxito.

---

## [2026-05-18] Arquitectura Basada en Modos (Sectores de Trabajo)

**Objetivo:** Definir e implementar los 8 Modos estructurales de Palmera, adaptando el Sidebar reactivo, el Gestor Visual de Modos de Trabajo en Ajustes, y extendiendo el modelado Prisma de Contactos y del Modo Creativo.

### Cambios Realizados
1. **Tipos & Registro (`src/types/core.ts`)**: Registrada la interfaz `PalmModeConfig` para modelar los sectores.
2. **Registro de Modos (`src/modules/registry.ts`)**: Definidos los 8 modos de trabajo (Restaurante, Hotel, Logística, Finanzas, Creativo, Tecnológico, Dirección, Gestión de equipo) con metadatos y menús correspondientes.
3. **Sidebar Reactivo (`src/components/admin/AdminSidebar.tsx`)**: Refactorizado para cargar dinámicamente los menús según modos activos en el cliente mediante escucha de eventos `localStorage` (`palmera_modes_updated`).
4. **Gestor Visual de Modos (`src/app/admin/settings/modules/page.tsx`)**: Diseñado para activar/desactivar sectores con toasts y transiciones reactivas.
5. **Modelado Prisma (`prisma/schema.prisma`)**: Añadidas propiedades a `Contact` y creadas las entidades para el Modo Creativo (`Artwork`, `Consignment`, `ConsignmentLine`, `Certificate`) y enums asociados.
6. **Verificación de Tipos**: Compilado y aprobado en verde (exit code 0).

**Estado:** Arquitectura basada en modos completada y validada.

---

## [2026-05-19] Feature #3 — Autenticación Segura Multi-Tenant (auth_next) y Nuevos Modos

**Objetivo:** Implementar la autenticación de usuarios mediante NextAuth, resolviendo el inquilino (tenant) mediante subdominios (multi-tenant), protegiendo rutas bajo `/admin`, creando vistas de login/registro premium, y registrando 4 nuevos modos (CRM, Atención al cliente, Comunicación, Gestión de proyectos).

### Cambios Realizados
1. **Esquema Multi-Tenant (`prisma/schema.prisma`)**: Ampliado el modelo `ModeType` enum para soportar `CRM`, `ATENCION_CLIENTE`, `COMUNICACION` y `GESTION_PROYECTOS`.
2. **Registro de Modos (`src/modules/registry.ts`)**: Registrados los 4 nuevos sectores con sus correspondientes metadatos, descripciones y menús. Renombrada la opción de Ajustes a "Gestión de modos".
3. **Control Global de Modos (`src/app/admin/settings/modules/page.tsx`)**: Añadidos controles maestros para "Activar Todos" y "Desactivar Todos" con persistencia en `localStorage` y emisión reactiva de eventos.
4. **Prisma Seed (`prisma/seed.js`)**: Creado script para sembrar inquilino de demostración (`gastroshows`), usuario administrador (`admin@gastroshows.es`) y ajustes del sistema.
5. **Configuración de NextAuth (`src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`)**: Creado el endpoint y configurado el proveedor de credenciales (email, password y tenantSlug). Añadidas declaraciones de TypeScript para extender tipos en `src/types/next-auth.d.ts`.
6. **Middleware Multi-Tenant (`src/middleware.ts`)**: Diseñado middleware que detecta el slug del subdominio del Host, inyecta la cabecera `x-tenant-slug`, y restringe acceso a `/admin` validando que la sesión pertenezca al inquilino correcto.
7. **Diseño Premium (`src/app/login/page.tsx`, `src/app/register/page.tsx`)**: Diseñadas las pantallas de Login y Registro con estética esmerilada/metálica, soporte de resolución de tenant y generación automática de URL de acceso.
8. **Sidebar Dinámico (`src/components/admin/AdminSidebar.tsx`)**: Integrado hook `useSession` para mostrar dinámicamente avatar, nombre y email del usuario logueado en el footer con botón de "Cerrar sesión".

**Estado:** Autenticación multi-tenant y registro de nuevos modos completados y validados estrictamente (0 errores tsc).

---

## [2026-05-19] Feature #7 — Consola Global de Gestión de Instancias (saas_superadmin)

**Objetivo:** Diseñar e implementar la interfaz global del Superadministrador del SaaS bajo `/superadmin` para monitorizar y controlar el estado de instancias (tenants), visualizar un log global cruzado de auditoría, y generar enlaces únicos pre-cumplimentados de invitación.

### Cambios Realizados
1. **API de Instancias (`src/app/api/superadmin/instances/route.ts`)**: Creada API que lee las instancias y los registros de auditoría de la base de datos de PostgreSQL con un fallback inteligente a mockups dinámicos si no hay base de datos conectada.
2. **API de Invitación (`src/app/api/superadmin/invite/route.ts`)**: Creado endpoint que genera códigos e hilos de invitación únicos pre-cumplimentando el nombre, email y empresa en la URL.
3. **Consola Visual (`src/app/superadmin/page.tsx`)**: Diseñada una interfaz premium, oscura y adaptable con 4 secciones: Resumen (KPIs y velocidad), Instancias (con toggle de suspensión de cliente y lista de usuarios), Log Global (filtro de logs en tiempo real), e Invitaciones (creador y log local).
4. **Pre-rellenado de Registro (`src/app/register/page.tsx`)**: Modificada la vista de registro para que, al detectar parámetros como `code`, `email`, `name` y `company`, rellene y configure el formulario automáticamente, asociando el token al inquilino correspondiente tras registrarse.
5. **Verificación**: Validación y compilación de TypeScript completada exitosamente sin errores.

**Estado:** Consola global de administración (superadmin) completada y validada en su totalidad.

---

## [2026-05-19] Sistema de Descansos Activos y Fondo Marino Global (live_water_background)

**Objetivo:** Extender el efecto de fondo de agua y peces de forma global a todo el ERP (Login, Registro, CRM de Administración, y panel de Superadmin), programando una mecánica de pausas activas (10 unidades de descanso por día) donde hacer clic en un pez permita iniciar un bloqueo de pantalla temporal con guía de respiración ineludible.

### Cambios Realizados
1. **Fondo Globalizado (`src/app/layout.tsx`)**: Movido el componente `<WaterBackground />` a la raíz del diseño global para persistir su ciclo de animación durante la navegación entre rutas sin reiniciar el canvas.
2. **ERP Transparente (`src/components/admin/AdminLayout.tsx`, `src/app/superadmin/page.tsx`)**: Reemplazadas las clases de fondos opacos (`bg-background` y degradados de Superadmin) por `bg-transparent`, permitiendo que el mar y los peces sean visibles debajo de todos los módulos y paneles administrativos.
3. **Mecánica de Descanso y Persistencia (`src/components/WaterBackground.tsx`)**:
   - **Registro diario**: Almacena `palmera_fish_rests` en `localStorage` con la fecha del día. Si cambia la fecha, restablece el contador de descansos disponibles a 10.
   - **Peces dinámicos**: El número de peces nadando corresponde al número de descansos disponibles del día (empezando con 10).
   - **Detección de clics en el fondo**: Escucha clics globales en la pantalla, filtra los elementos de la interfaz interactivos (inputs, botones, etc.) y detecta si el usuario hizo clic en la cabeza o cuerpo de un pez.
   - **Menú de opciones (Glassmorphism)**: Muestra una tarjeta contextual sobre el pez clicado con opciones de descanso de 5', 10' o Personalizar (permite ingresar minutos decimales o enteros).
   - **Bloqueo Ineludible (Screen Lock)**: Al iniciar un descanso, el pez seleccionado incrementa su velocidad nadando de forma acelerada hacia afuera de la pantalla hasta desaparecer. Al mismo tiempo, se despliega un panel fijo en pantalla completa (`z-[999999]`) que bloquea todo clic o pulsación de tecla durante la sesión.
   - **Cero Estímulos (Sin texto ni cronómetros)**: Se eliminaron todos los textos, títulos y temporizadores numéricos de la pantalla de bloqueo durante el descanso para asegurar un entorno de relajación libre de estímulos visuales cognitivos.
   - **Orbe de Respiración Atmosférico**: Se rediseñó la guía central como un orbe espacial de gran tamaño (`w-80 h-80`) que pulsa cíclicamente a ritmo de respiración lenta (6 segundos). Tiene un aura resplandeciente doble de gradientes naranja-cian que se expande por la pantalla y luces difusas de nebulosas animadas.
   - **Música de Relajación Dinámica (Web Audio API)**: Se programó un sintetizador generativo cliente-servidor nativo (Web Audio API) que produce un acorde continuo (notas base A2, quinta E3, octava A3) filtrado en frecuencia por un oscilador lento de baja frecuencia (LFO) a 0.08Hz para producir swells tridimensionales relajantes de forma offline y con cero consumo de red.
   - **Mute Toggle y Auto Fullscreen**: Al hacer clic en un pez y comenzar el descanso, el navegador entra en pantalla completa nativa de forma automática. Un botón discreto en el borde inferior permite silenciar o activar la música espacial. Al completarse el temporizador, el sistema sale automáticamente de pantalla completa y desbloquea el ERP.
4. **Limpieza de Vistas Locales**: Removidas las referencias manuales de `<WaterBackground />` de `src/app/login/page.tsx` y `src/app/register/page.tsx` para evitar duplicación.

**Estado:** Sistema de descansos y fondo global marino completado y verificado con 0 errores TypeScript.

---

## [2026-05-20] Módulo de Ventas e Integración de CRM (Sustitución de Modo CRM)

**Objetivo:** Sustituir el Modo CRM por un Módulo Ventas modular e instalable/desinstalable. Limpiar las denominaciones de todos los sectores de trabajo para eliminar el término "Modo", renombrando "Modo Tecnológico" a "Tech".

### Cambios Realizados
1. **Esquema de Base de Datos (`prisma/schema.prisma` & `src/app/api/register/route.ts`)**:
   - Actualizado el enum `ModeType` (de `CRM` a `VENTAS`).
   - Re-generado el Prisma client y actualizado el valor por defecto asignado al registrarse a `VENTAS`.
2. **Registro de Sectores (`src/modules/registry.ts` & descriptor `src/modules/sales/module.ts`)**:
   - Eliminado el módulo core `crm` fijo.
   - Removido el término "Modo" de todos los títulos. Renombrado "Modo Tecnológico" a "Tech" con la clave `TECNOLOGICO`.
   - Incorporado el sector de trabajo `VENTAS` mapeado a `/admin/sales` con sus sub-enlaces.
3. **Workspace de Ventas (`src/modules/sales/components/`)**:
   - `SalesDashboard.tsx`: Centraliza el panel y sus sub-pestañas operativas con estadísticas agregadas.
   - `ProspectingTab.tsx`: Tablero Kanban de arrastrar y soltar para calificar prospectos visualmente.
   - `OpportunitiesTab.tsx`: Control de cotizaciones de contratos, probabilidades de éxito y marcación de victorias.
   - `FollowUpTab.tsx`: Historial de llamadas, correos e interacciones con filtros rápidos en línea de tiempo.
   - `ContactsTab.tsx`: Libreta de contactos integrada con registro directo de interacciones en caliente.
   - `AnalyticsTab.tsx`: Análisis de BI con simulador interactivo de ingresos mensuales basado en sliders.
4. **Adaptador de Rutas y Guard de Instalación (`src/app/admin/sales/page.tsx`)**:
   - Actúa como instalador dinámico si el módulo de ventas no está habilitado, con una landing comercial premium y activación en tiempo real sin recargar página.
5. **Alineación de Interfaz y Labels**:
   - Modificado el Sidebar (`AdminSidebar.tsx`) para cambiar "Modos Operativos" a "Sectores Operativos".
   - Actualizados los textos en Ajustes de Módulos (`src/app/admin/settings/modules/page.tsx`) para usar "Sectores" en lugar de "Modos" y simplificar botones.
   - Limpiados textos en el dashboard principal (`src/app/admin/page.tsx`), perfiles de usuario (`src/app/admin/settings/users/page.tsx`), descriptor de auditorías superadmin (`src/app/api/superadmin/instances/route.ts`) y configurador de IA (`src/lib/ai-service.ts`).

**Estado:** Módulo de Ventas e Integración de CRM completado y verificado con 0 errores TypeScript.

---

## [2026-05-20] Auto-Scouter IA de Leads y Asistente de Prospección Telefónica

**Objetivo:** Desarrollar herramientas de prospección automática de datos de empresas locales (Ventas corporativas y team building) y un asistente interactivo de primera llamada con guiones y checklists de cualificación.

### Cambios Realizados
1. **Componente de IA (`src/lib/ai-service.ts`)**:
   - Creado y exportado el método `callGeneralAI` para habilitar consultas con prompts personalizados y autónomos.
2. **API Endpoint (`src/app/api/sales/scout/route.ts`)**:
   - Endpoint `/api/sales/scout` que toma filtros de categoría y actividad corporativa para obtener 5 prospectos.
   - Diseñado un motor de contingencia (fallback) con base de datos de empresas reales de Barcelona (Glovo, Typeform, Deloitte, Cuatrecasas, Ogilvy, etc.) con sus teléfonos, cargos y guiones asignados en caso de inactividad de las API keys.
3. **Tablero Scouter IA (`src/modules/sales/components/ScouterTab.tsx`)**:
   - Panel interactivo con formulario de filtros, loader animado que simula las etapas del escaneo y tarjetas de prospectos con afinidad, presupuesto, guión de apertura y botón de importación directa a Ventas & CRM.
4. **Asistente de Prospección Telefónica (`src/modules/sales/components/ContactsTab.tsx`)**:
   - Agregada acción "Llamar con Guión" que abre un modal de llamada asistida.
   - Integra un temporizador activo, lectura del guión "icebreaker" sugerido para romper el hielo y un checklist de cualificación con criterios operativos (menú poco modificable por alergias, aforo, idioma, fecha y presupuesto).
   - Generación y guardado automatizado de las notas de la llamada en la libreta del CRM al finalizar.
5. **Dashboard de Ventas (`src/modules/sales/components/SalesDashboard.tsx`)**:
   - Registrada la nueva pestaña `"scouter"` y agregado el botón "Scouter IA" a la barra de navegación del módulo.

**Estado:** Buscador IA y Asistente de Prospección Telefónica completado. Integrada y testeada con éxito la API de Apollo.io utilizando la clave de API activa del usuario en el entorno local. Se ajustaron los colores del sidebar (`bg-white` en modo claro y `text-amber-700` para elementos activos) para garantizar un contraste perfecto y legibilidad con 0 errores de compilación.

---

## [2026-05-20] Módulo de Embudo de Ventas (Sales Funnel) Analítico

**Objetivo:** Crear un panel dedicado para analizar el flujo y la salud del pipeline comercial, incluyendo métricas clave de conversión, alertas de estancamiento de leads y previsión de ingresos ponderada.

### Cambios Realizados
1. **Componente de Embudo (`src/modules/sales/components/FunnelTab.tsx`)**:
   - Creada una interfaz premium que agrupa leads e interacciones históricas.
   - Diseñado un gráfico de embudo piramidal invertido con CSS responsivo que expone el conteo y valor acumulado en cada etapa (Contacto, Cualificación, Propuesta, Negociación y Cierre/Ganado), calculando de forma automática el porcentaje de conversión de paso entre etapas.
   - Desarrollada una calculadora de **Previsión de Ingresos Ponderada** con sliders interactivos de porcentaje de probabilidad por fase para predecir entradas estimadas en caja.
   - Incorporado un panel de **Alerta de Estancamiento (Stagnant Leads)** que notifica los clientes potenciales sin actividad comercial en los últimos 7 días.
   - Reporte gráfico rápido de Win Rate (Tasa de Cierre de Contratos).
2. **Registro de Navegación (`src/modules/sales/components/SalesDashboard.tsx`)**:
   - Importado y renderizado el componente de embudo bajo la pestaña `"funnel"`.

**Estado:** Embudo de Ventas y analítica predictiva completados con éxito y verificado sin errores TypeScript.

---

## [2026-08-31] Módulo de Compras Inteligentes Predictivas & Suite de Dirección de Restaurante

**Objetivo:** Desarrollar el módulo de **Compras Inteligentes (`COMPRAS_INTELIGENTES`)** centrado en la proyección predictiva de pedidos por velocidad de consumo y cadencia histórica, ampliar el **Planificador de Turnos y Vacaciones (`GESTION_EQUIPO`)**, y crear la **Suite de Dirección de Restaurante** (Mermas, Sanidad HACCP y Cierre de Servicio).

### Cambios Realizados
1. **Módulo de Compras Inteligentes (`src/modules/purchasing/`)**:
   - `PurchasingDashboard.tsx`: Panel con 4 pestañas operativas:
     - **Sugerencias de Compra IA (Motor Predictivo)**: Calcula días de stock restante, cadencia media de reposición y punto de pedido automático para materias primas, bebidas, químicos de limpieza, menaje y embalaje.
     - **Generador de Pedidos a Proveedor**: Agrupa necesidades por proveedor con botón de despacho en 1 clic por WhatsApp Web / Email.
     - **Auditoría de Albaranes**: Detecta subidas de precio no pactadas en facturas de proveedores.
     - **Catálogo de Productos**: Gestión de Lead Times y unidades de empaquetado.
   - Descriptor `module.ts` y ruta `/admin/purchasing`.
2. **Ampliación de Gestión de Equipo (`src/modules/team/`)**:
   - `ShiftPlannerTab.tsx`: Cuadrante semanal de turnos por empleado y rol (*Cocina, Sala, Barra, Limpieza*), cálculo de masa salarial y **ratio de Labor Cost %** vs venta prevista.
   - `VacationRequestsTab.tsx`: Flujo de solicitud de vacaciones con detector automático de solapamientos entre puestos clave.
   - Rutas `/admin/team/shifts` y `/admin/team/clocking`.
3. **Suite de Dirección de Restaurante (`src/modules/restaurant_ops/`)**:
   - `WasteTrackerTab.tsx`: Control de mermas y desperdicios con cálculo de impacto monetario directo en margen.
   - `HaccpComplianceTab.tsx`: Registro digital sanitario HACCP para temperaturas de cámaras frigoríficas y congeladores.
   - `DailyShiftReportTab.tsx`: Diario de cierre de turno del director con cuadre de ventas, comensales, ticket medio e incidencias.
   - Rutas `/admin/restaurant/waste`, `/admin/restaurant/haccp` y `/admin/restaurant/daily-report`.
4. **Registro Global (`src/modules/registry.ts` & `AdminSidebar.tsx`)**:
   - Incorporados los módulos al registro de sectores y configurados como activos por defecto en el menú lateral.
5. **Verificación de Entorno**:
   - TypeScript `npx tsc --noEmit` pasado al 100% con 0 errores.
   - Next.js `npm run build` compilando exitosamente las 28 rutas estáticas y dinámicas.
   - Script `./init.sh` aprobado con éxito.

**Estado:** Módulo de Compras Inteligentes, Gestión de Equipo y Herramientas de Dirección de Restaurante completados y validados.

---

## [2026-09-15] Profesor = Usuario real (fix Educación + Usuarios)

**Objetivo:** Eliminar los profesores de ejemplo no vinculables y hacer que todo profesor nazca de un usuario real del ERP.

### Logros
1. **Lógica única (`src/lib/professors.ts`)**: crear/editar/archivar/eliminar profesor siempre sobre `User` (role `PROFESSOR`) + `EduTeacherProfile`. Borrado bloqueado con 409 si tiene clases.
2. **Nueva API `src/app/api/admin/users` (+ `[id]`)**: CRUD real de usuarios (GET/POST/PATCH/DELETE, solo ADMIN/DEV). Rol `PROFESSOR` crea el perfil y vincula a la sección Profesor; salir del rol lo desvincula.
3. **API `src/app/api/education/teachers`**: reescrita sobre la lógica única (POST crea `PROFESSOR`, + PATCH/DELETE). GET solo datos reales con `lessonCount`.
4. **UI Profesor (`ProfessorsManager.tsx`)**: fuera seeds `Ana García`/`Carlos Ruiz` y `localStorage`; lista/edita/archiva contra la API.
5. **UI Usuarios (`admin/settings/users/page.tsx`)**: fuera demos `localStorage` y campos ficticios (`username`, notas); conectada a la API con rol 🎸 Profesor + instrumentos.
6. **Agenda (`EducationAgenda.tsx`)**: desplegable de profesor desde la API; fuera mocks `Prof. Ana/Carlos/GetLoud`.
7. **SQL Supabase (`supabase_full.sql`)**: script completo idempotente generado desde `prisma/schema.prisma` (32 tablas, 22 enums, RLS).
8. **Verificación**: `./init.sh` verde, `npx tsc --noEmit` 0 errores, `npm test` 8/8 OK.
9. **Seguridad**: `.env.example` revertido a placeholder (la `DATABASE_URL` real va en `.env.local` gitignorado y en el dashboard de Vercel, nunca en git).

**Estado:** Fix verificado y pusheado a `dst/master` para deploy en Vercel. Feature #8 `education_mode` sigue `blocked` (fix parcial).

