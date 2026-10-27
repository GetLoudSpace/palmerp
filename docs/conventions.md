# Convenciones de Código — Palm ERP Core

> La homogeneidad extrema facilita la predictibilidad. Los agentes y programadores deben escribir código consistente en todo el repositorio.

## 1. Stack Tecnológico & Estilo

- **Versión de TypeScript**: Estricto. Siempre tipar argumentos, retornos y states de React. Evitar `any` a toda costa.
- **Next.js**: Estilo App Router.
  - Las páginas públicas y vistas residen en `/src/app/`.
  - Las Server Actions o utilidades se definen en archivos con sufijo `.actions.ts` o `.ts` respectivamente.
- **Tailwind CSS v4**: Uso estricto de clases de utilidad consistentes. Modo oscuro integrado nativamente usando clases `dark:`.
- **React 19**: Uso de Server Components por defecto. Solo agregar `"use client"` cuando haya interactividad del lado del cliente (estados, efectos, interactores).

---

## 2. Convenciones de Nombres

| Tipo | Convención | Ejemplo |
| :--- | :--- | :--- |
| Componentes React | `PascalCase` | `AdminSidebar.tsx` |
| Rutas y Páginas | `kebab-case` | `/admin/ajustes/page.tsx` |
| Server Actions | `camelCase` | `createContact.ts` |
| Modelos de Prisma | `PascalCase` (Singular) | `AuditLog` |
| Enums y Roles | `UPPER_SNAKE` | `UserRole.ADMIN` |

---

## 3. Estructura de Módulos (Enchufes)

Cada módulo en `/src/modules/` debe declarar un archivo descriptor de configuración llamado `module.ts`:

```typescript
// Ejemplo de src/modules/reservas/module.ts
import { PalmModule } from "@/types/core";

export const bookingsModule: PalmModule = {
  id: "bookings",
  name: "Reservas & Eventos",
  icon: "Calendar",
  category: "Operaciones",
  menuItems: [
    { label: "Dashboard", path: "/admin/reservas" },
    { label: "Mesas e Instalaciones", path: "/admin/reservas/mesas" }
  ],
  requiredRole: "STAFF"
};
```

---

## 3.bis Persistencia de Datos (regla general)

- **Servidor como única fuente de verdad.** Todo dato de negocio (registros, envíos, clases, progreso, ajustes compartidos, auditoría) se guarda en la base de datos mediante una API del servidor. Nunca en `localStorage`, `sessionStorage`, IndexedDB ni estado efímero del navegador.
- **Datos compartidos entre dispositivos.** Cualquier usuario debe ver la misma información al entrar desde otro ordenador con internet.
- **Excepción mínima:** `localStorage` solo para preferencias visuales del dispositivo (tema, paneles colapsados), nunca para datos de negocio.

---

## 4. Control de Errores y Excepciones

- **API Routes / Server Actions**: Toda acción del lado del servidor que pueda fallar debe envolverse en un bloque `try/catch` y devolver una estructura consistente de respuesta a la UI:
  ```typescript
  export interface ActionResult<T> {
    success: boolean;
    data?: T;
    error?: string;
  }
  ```
- **Fuga de Información**: Nunca propagar excepciones nativas de la base de datos (ej. errores internos de Prisma) al cliente. Capturarlas en el servidor, registrarlas mediante logs seguros y retornar un mensaje genérico amigable al usuario.
- **Timezones**: Las fechas se guardan estrictamente en formato UTC en la base de datos. La conversión a la zona horaria del cliente o a la del servidor principal de operaciones (ej. Madrid para Gastroshows) se realiza únicamente en el punto de presentación.
