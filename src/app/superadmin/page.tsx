"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import SmartSearchInput from "@/components/SmartSearchInput";

interface SuperadminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  password?: string; 
}

interface SuperadminTenant {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  isActive: boolean;
  createdAt: string;
  users: SuperadminUser[];
  settings?: Array<{ key: string; value: string }>;
}

interface SuperadminAuditLog {
  id: string;
  tenant: string;
  action: string;
  userId?: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

interface SuperadminInvitation {
  code: string;
  recipientName: string;
  recipientEmail: string;
  companyName: string;
  isUsed: boolean;
  createdAt: string;
  usedAt?: string;
}

export default function SuperadminPage() {
  const [activeTab, setActiveTab] = useState<"resumen" | "instancias" | "logs" | "invitaciones">("resumen");
  const [tenants, setTenants] = useState<SuperadminTenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<SuperadminAuditLog[]>([]);
  const [invitations, setInvitations] = useState<SuperadminInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // User Management Modal State
  const [selectedTenant, setSelectedTenant] = useState<SuperadminTenant | null>(null);
  const [editableUsers, setEditableUsers] = useState<SuperadminUser[]>([]);
  
  // Add user sub-form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("STAFF");
  const [newUserPassword, setNewUserPassword] = useState("");

  // Simulated Email Modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDetails, setEmailDetails] = useState<{
    to: string;
    name: string;
    tenantSlug: string;
    role: string;
    tempPassword?: string;
    accessLink: string;
  } | null>(null);

  // Invitation Form
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<SuperadminTenant | null>(null);
  const [instanceName, setInstanceName] = useState("");
  const [instanceDomain, setInstanceDomain] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SuperadminTenant | null>(null);
  const [deletePhrase, setDeletePhrase] = useState("");

  // Create Instance Modal State — SAAS single-VPS only (ON_PREMISE kept in types for future)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState<{
    name: string;
    slug: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    domain: string;
    timezone: string;
    deploymentType: "SAAS" | "ON_PREMISE";
    modes: string;
  }>({
    name: "",
    slug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    domain: "",
    timezone: "Europe/Madrid",
    deploymentType: "SAAS",
    modes: ""
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createTechnical, setCreateTechnical] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Search filters
  const [tenantSearch, setTenantSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");

  // Access Menu State
  const [accessMenuOpen, setAccessMenuOpen] = useState<{ tenantId: string; x: number; y: number } | null>(null);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState<SuperadminUser | null>(null);


  // Load instances, audit logs and local invitations
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/superadmin/instances");
        const data = await res.json();
        if (data.success) {
          const savedTenants = localStorage.getItem("palmera_superadmin_tenants");
          if (savedTenants) {
            try {
              setTenants(JSON.parse(savedTenants));
            } catch (e) {
              setTenants(data.tenants);
            }
          } else {
            setTenants(data.tenants);
          }
          setAuditLogs(data.auditLogs);
        }
      } catch (err) {
        console.error("Error loading superadmin data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Load invitations from localStorage
    const savedInvites = localStorage.getItem("palmera_superadmin_invites");
    if (savedInvites) {
      try {
        setInvitations(JSON.parse(savedInvites));
      } catch (e) {
        // ignore
      }
    } else {
      const mockInvites = [
        {
          code: "INV-DEMO123",
          recipientName: "Carlos Gómez",
          recipientEmail: "carlos@gomez.com",
          companyName: "Gómez Eventos",
          isUsed: true,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          usedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          code: "INV-A9B8C7D6",
          recipientName: "Lucía Pérez",
          recipientEmail: "lucia@perez.com",
          companyName: "Pérez Logística",
          isUsed: false,
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        }
      ];
      setInvitations(mockInvites);
      localStorage.setItem("palmera_superadmin_invites", JSON.stringify(mockInvites));
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const updateTenantsState = async (updated: SuperadminTenant[]) => {
    setTenants(updated);
    localStorage.setItem("palmera_superadmin_tenants", JSON.stringify(updated));
    try {
      await fetch("/api/superadmin/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenants: updated }),
      });
    } catch (err) {
      console.warn("Failed to sync tenants with mock database:", err);
    }
  };

  const handleToggleTenant = (tenantId: string) => {
    const updated = tenants.map((t) => {
      if (t.id === tenantId) {
        const nextState = !t.isActive;
        const newLog: SuperadminAuditLog = {
          id: "al-" + Date.now(),
          tenant: t.slug,
          action: nextState ? "INSTANCE_ACTIVATED" : "INSTANCE_SUSPENDED",
          userId: "SUPERADMIN",
          details: `Instancia '${t.name}' (${t.slug}) fue ${nextState ? "activada" : "suspendida"} por el Superadministrador.`,
          ipAddress: "127.0.0.1",
          createdAt: new Date().toISOString(),
        };
        setAuditLogs((prev) => [newLog, ...prev]);
        return { ...t, isActive: nextState };
      }
      return t;
    });

    updateTenantsState(updated);
    showToast("Estado de instancia actualizado.");
  };

  const getTenantSetting = (tenant: SuperadminTenant, key: string) => {
    return tenant.settings?.find((setting) => setting.key === key)?.value;
  };

  const isMaintenanceEnabled = (tenant: SuperadminTenant) => {
    return getTenantSetting(tenant, "maintenance_mode") === "true";
  };

  const getInstanceDatabaseName = (slug: string) => {
    return `palmera_${slug.replace(/-/g, "_")}`;
  };

  const getProvisionCommand = (tenant: SuperadminTenant) => {
    return [
      "npm run instance:provision --",
      `  --slug ${tenant.slug}`,
      `  --name "${tenant.name}"`,
      `  --domain ${tenant.domain || `${tenant.slug}.palmera.io`}`,
      "  --admin-name \"Admin\"",
      `  --admin-email admin@${tenant.domain || `${tenant.slug}.palmera.io`}`,
    ].join("\n");
  };

  const openInstanceManagement = (tenant: SuperadminTenant) => {
    setSelectedInstance(tenant);
    setInstanceName(tenant.name);
    setInstanceDomain(tenant.domain || `${tenant.slug}.palmera.io`);
  };

  const patchTenant = async (tenantId: string, payload: Record<string, unknown>) => {
    await fetch("/api/superadmin/instances", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, ...payload }),
    });
  };

  const handleSaveInstance = async () => {
    if (!selectedInstance) return;

    const cleanName = instanceName.trim();
    const cleanDomain = instanceDomain.trim();
    if (!cleanName) {
      showToast("El nombre de la instancia es obligatorio.");
      return;
    }

    const updatedTenants = tenants.map((tenant) => {
      if (tenant.id !== selectedInstance.id) return tenant;
      return { ...tenant, name: cleanName, domain: cleanDomain || null };
    });

    setTenants(updatedTenants);
    localStorage.setItem("palmera_superadmin_tenants", JSON.stringify(updatedTenants));
    await patchTenant(selectedInstance.id, { name: cleanName, domain: cleanDomain });
    setSelectedInstance(null);
    showToast("Instancia actualizada.");
  };

  const handleToggleMaintenance = async (tenant: SuperadminTenant) => {
    const nextMaintenanceMode = !isMaintenanceEnabled(tenant);
    const updatedTenants = tenants.map((item) => {
      if (item.id !== tenant.id) return item;
      const settings = [
        ...(item.settings?.filter((setting) => setting.key !== "maintenance_mode") ?? []),
        { key: "maintenance_mode", value: String(nextMaintenanceMode) },
      ];
      return { ...item, settings };
    });

    setTenants(updatedTenants);
    localStorage.setItem("palmera_superadmin_tenants", JSON.stringify(updatedTenants));
    await patchTenant(tenant.id, { maintenanceMode: nextMaintenanceMode });
    showToast(nextMaintenanceMode ? "Modo mantenimiento activado." : "Modo mantenimiento desactivado.");
  };

  const handleDeleteInstance = async () => {
    if (!deleteTarget || deletePhrase !== deleteTarget.slug) return;

    const updatedTenants = tenants.filter((tenant) => tenant.id !== deleteTarget.id);
    setTenants(updatedTenants);
    localStorage.setItem("palmera_superadmin_tenants", JSON.stringify(updatedTenants));
    await fetch(`/api/superadmin/instances?tenantId=${encodeURIComponent(deleteTarget.id)}`, {
      method: "DELETE",
    });

    const newLog: SuperadminAuditLog = {
      id: "al-" + Date.now(),
      tenant: deleteTarget.slug,
      action: "INSTANCE_DELETED",
      userId: "SUPERADMIN",
      details: `Instancia '${deleteTarget.name}' (${deleteTarget.slug}) eliminada desde Superadmin.`,
      ipAddress: "127.0.0.1",
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    setDeleteTarget(null);
    setDeletePhrase("");
    showToast("Instancia eliminada.");
  };

  const normalizeSlug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const buildTechnicalDetails = (opts: {
    payload?: Record<string, unknown>;
    httpStatus?: number;
    serverData?: unknown;
    error?: unknown;
  }): string => {
    const err = opts.error as any;
    const serializeError = (error: unknown): Record<string, unknown> => {
      if (!error) return {};
      if (error instanceof Error) {
        const anyErr = error as any;
        return {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: anyErr.cause ? String(anyErr.cause) : undefined,
          // AggregateError has .errors
          errors: Array.isArray(anyErr.errors)
            ? anyErr.errors.map((e: unknown) => (e instanceof Error ? { name: (e as Error).name, message: (e as Error).message, stack: (e as Error).stack } : String(e)))
            : undefined,
          code: anyErr.code,
        };
      }
      if (typeof error === "object") return error as Record<string, unknown>;
      return { value: String(error) };
    };

    const details: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      payload: opts.payload,
      httpStatus: opts.httpStatus,
      serverResponse: opts.serverData,
      clientError: serializeError(opts.error),
    };
    // Prettify AggregateError inner messages if present
    const clientErr = details.clientError as any;
    if (clientErr?.errors?.length) {
      details.aggregateMessages = clientErr.errors.map((e: any) => e.message || String(e));
    }
    return JSON.stringify(details, null, 2);
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateTechnical(null);

    const slug = normalizeSlug(createData.slug);
    const name = createData.name.trim();
    const adminName = createData.adminName.trim();
    const adminEmail = createData.adminEmail.trim().toLowerCase();
    const adminPassword = createData.adminPassword.trim();
    const domain = createData.domain.trim();
    const timezone = createData.timezone.trim() || "Europe/Madrid";
    const modes = createData.modes
      .split(",")
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean);

    if (!slug || slug.length < 3) {
      setCreateError("El slug debe tener al menos 3 caracteres (a-z, 0-9, -).");
      return;
    }
    if (!name || !adminName || !adminEmail) {
      setCreateError("Nombre de instancia, administrador y email son obligatorios.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      setCreateError("Email de administrador no válido.");
      return;
    }
    if (tenants.some((t) => t.slug.toLowerCase() === slug.toLowerCase())) {
      setCreateError(`Ya existe una instancia con slug "${slug}".`);
      return;
    }

    const payload = {
      slug,
      name,
      adminName,
      adminEmail,
      adminPassword: adminPassword ? "***" : undefined,
      domain: domain || undefined,
      timezone,
      modes,
      deploymentType: "SAAS" as const,
    };
    const rawPayload = {
      slug,
      name,
      adminName,
      adminEmail,
      adminPassword: adminPassword || undefined,
      domain: domain || undefined,
      timezone,
      modes,
      deploymentType: "SAAS" as const,
    };

    setCreateLoading(true);
    try {
      const res = await fetch("/api/superadmin/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rawPayload),
      });
      let data: any = null;
      let rawText: string | null = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        try {
          rawText = await res.text();
        } catch {}
      }
      if (!res.ok || !data?.success) {
        const serverMsg = data?.error || rawText || `HTTP ${res.status} sin cuerpo JSON`;
        const technical = buildTechnicalDetails({
          payload,
          httpStatus: res.status,
          serverData: data ?? rawText ?? null,
          error: new Error(serverMsg),
        });
        const enrichedTechnical = data?.details
          ? JSON.stringify(
              {
                ...JSON.parse(technical),
                serverDetails: data.details,
              },
              null,
              2
            )
          : technical;
        setCreateTechnical(enrichedTechnical);
        const shortMsg = data?.details?.message || serverMsg;
        const isAggregate = /AggregateError/i.test(shortMsg) || /AggregateError/i.test(JSON.stringify(data?.details ?? ""));
        setCreateError(
          isAggregate
            ? `AggregateError — revisa detalles técnicos abajo. ${shortMsg}`
            : shortMsg
        );
        setShowErrorModal(true);
        setCreateLoading(false);
        return;
      }

      // Build optimistic tenant for single-VPS SAAS (mirrors API behavior until GET refresh)
      const newTenant: SuperadminTenant = {
        id: data.tenantId || `t-${Date.now()}`,
        slug,
        name,
        domain: domain || `${slug}.palmerp.es`,
        isActive: true,
        createdAt: new Date().toISOString(),
        users: [
          {
            id: `u-${Date.now()}`,
            name: adminName,
            email: adminEmail,
            role: "ADMIN",
            createdAt: new Date().toISOString(),
          },
        ],
        settings: [
          { key: "maintenance_mode", value: "false" },
          { key: "palmera_active_modes", value: JSON.stringify(modes) },
        ],
      };

      // Persist to mock layer for local dev without DB (API already does it server-side)
      const nextTenants = [newTenant, ...tenants];
      setTenants(nextTenants);
      localStorage.setItem("palmera_superadmin_tenants", JSON.stringify(nextTenants));

      // Refresh from server (DB or mock) to get canonical data
      try {
        const refresh = await fetch("/api/superadmin/instances");
        const rdata = await refresh.json();
        if (rdata.success && Array.isArray(rdata.tenants)) {
          setTenants(rdata.tenants);
          localStorage.setItem("palmera_superadmin_tenants", JSON.stringify(rdata.tenants));
        }
      } catch {}

      setAuditLogs((prev) => [
        {
          id: `al-${Date.now()}`,
          tenant: slug,
          action: "INSTANCE_CREATED",
          userId: "SUPERADMIN",
          details: `Instancia '${name}' (${slug}) creada en VPS (SAAS) por Superadmin.`,
          ipAddress: "127.0.0.1",
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      setShowCreateModal(false);
      setCreateData({
        name: "",
        slug: "",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
        domain: "",
        timezone: "Europe/Madrid",
        deploymentType: "SAAS",
        modes: "",
      });
      setCreateError(null);
      setCreateTechnical(null);
      showToast(`Instancia "${slug}" creada en este VPS.`);
    } catch (err: any) {
      const message = err?.message || "Error inesperado al crear la instancia.";
      setCreateError(message);
      const technical = buildTechnicalDetails({
        payload,
        error: err,
      });
      setCreateTechnical(technical);
      setShowErrorModal(true);
    } finally {
      setCreateLoading(false);
    }
  };

  // Secure Password Generator Helper
  const generateSecurePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let password = "";
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    password += "0123456789"[Math.floor(Math.random() * 10)];
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)];
    for (let i = 0; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

  // Manage Users
  const handleOpenUsersModal = (tenant: SuperadminTenant) => {
    setSelectedTenant(tenant);
    setEditableUsers(JSON.parse(JSON.stringify(tenant.users)));
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRole("STAFF");
    setNewUserPassword("");
  };

  const handleAddUserToEditable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const passwordToUse = newUserPassword || generateSecurePassword();

    const newUser: SuperadminUser = {
      id: "usr-" + Date.now(),
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      createdAt: new Date().toISOString(),
      password: passwordToUse
    };

    setEditableUsers([...editableUsers, newUser]);

    // Prepare simulated onboarding email
    const accessLink = `${window.location.protocol}//${selectedTenant?.slug}.localhost:3000/login?onboarding=true&email=${encodeURIComponent(newUserEmail)}`;
    setEmailDetails({
      to: newUserEmail,
      name: newUserName,
      tenantSlug: selectedTenant?.slug || "gastroshows",
      role: newUserRole,
      tempPassword: passwordToUse,
      accessLink
    });
    setShowEmailModal(true);

    // Reset subform
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRole("STAFF");
    setNewUserPassword("");
    showToast("Usuario creado. Notificación de email preparada.");
  };

  const handleEditUserField = (userId: string, field: keyof SuperadminUser, value: string) => {
    const updated = editableUsers.map((u) => {
      if (u.id === userId) {
        return { ...u, [field]: value };
      }
      return u;
    });
    setEditableUsers(updated);
  };

  const handleGeneratePasswordForUser = (userId: string) => {
    const securePass = generateSecurePassword();
    const updated = editableUsers.map((u) => {
      if (u.id === userId) {
        const accessLink = `${window.location.protocol}//${selectedTenant?.slug}.localhost:3000/login?onboarding=true&email=${encodeURIComponent(u.email)}`;
        setEmailDetails({
          to: u.email,
          name: u.name,
          tenantSlug: selectedTenant?.slug || "gastroshows",
          role: u.role,
          tempPassword: securePass,
          accessLink
        });
        setShowEmailModal(true);

        return { ...u, password: securePass };
      }
      return u;
    });
    setEditableUsers(updated);
    showToast("Contraseña segura generada.");
  };

  const handleDeleteUserFromEditable = (userId: string) => {
    const updated = editableUsers.filter((u) => u.id !== userId);
    setEditableUsers(updated);
    showToast("Usuario removido.");
  };

  const handleSaveUsers = () => {
    if (!selectedTenant) return;

    const updatedTenants = tenants.map((t) => {
      if (t.id === selectedTenant.id) {
        const newLog: SuperadminAuditLog = {
          id: "al-" + Date.now(),
          tenant: t.slug,
          action: "TENANT_USERS_MODIFIED",
          userId: "SUPERADMIN",
          details: `Modificados usuarios para la instancia '${t.name}'. Total usuarios: ${editableUsers.length}`,
          ipAddress: "127.0.0.1",
          createdAt: new Date().toISOString(),
        };
        setAuditLogs((prev) => [newLog, ...prev]);

        return { ...t, users: editableUsers };
      }
      return t;
    });

    updateTenantsState(updatedTenants);
    setSelectedTenant(null);
    showToast("Usuarios actualizados correctamente en la instancia.");
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);

    try {
      const res = await fetch("/api/superadmin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: inviteEmail,
          recipientName: inviteName,
          companyName: inviteCompany,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const newInvite: SuperadminInvitation = {
          code: data.code,
          recipientName: inviteName,
          recipientEmail: inviteEmail,
          companyName: inviteCompany,
          isUsed: false,
          createdAt: data.createdAt,
        };

        const updatedInvites = [newInvite, ...invitations];
        setInvitations(updatedInvites);
        localStorage.setItem("palmera_superadmin_invites", JSON.stringify(updatedInvites));
        
        setGeneratedLink(data.inviteLink);
        showToast("Enlace de invitación generado.");
        
        setInviteName("");
        setInviteEmail("");
        setInviteCompany("");
      } else {
        alert("Error al generar la invitación: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleQuickAccess = (e: React.MouseEvent, tenant: SuperadminTenant) => {
    setAccessMenuOpen({
      tenantId: tenant.id,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleAdminAccess = async (tenant: SuperadminTenant) => {
    try {
      // Request a Magic Link token from the backend
      const res = await fetch("/api/superadmin/access-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, role: "ADMIN" }),
      });
      const data = await res.json();

      if (data.success && data.url) {
        window.open(data.url, "_blank");
        showToast("Redirigiendo como Administrador...");
      } else {
        showToast("Error al generar acceso privilegiado.");
      }
    } catch (err) {
      showToast("Error de conexión.");
    } finally {
      setAccessMenuOpen(null);
    }
  };

  const handleUserAccess = (user: SuperadminUser, tenant: SuperadminTenant) => {
    const url = `${window.location.protocol}//${tenant.slug}.localhost:3000/login?user=${user.id}`;
    window.open(url, "_blank");
    showToast(`Redirigiendo como ${user.name}...`);
    setAccessMenuOpen(null);
    setSelectedUserForAccess(null);
  };

  const copyToClipboard = (text: string) => {

    navigator.clipboard.writeText(text);
    showToast("Copiado al portapapeles.");
  };

  const getInstanceUrl = (slug: string) => {
    if (typeof window === "undefined") return "#";
    const host = window.location.host; 
    const protocol = window.location.protocol;
    
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return `${protocol}//${slug}.localhost:3000/login`;
    } else {
      const parts = host.split(".");
      const baseDomain = parts.slice(-2).join(".");
      return `${protocol}//${slug}.${baseDomain}/login`;
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
      t.slug.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.details.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.tenant.toLowerCase().includes(logSearch.toLowerCase())
  );

  const activeCount = tenants.filter((t) => t.isActive).length;
  const totalUsers = tenants.reduce((acc, t) => acc + t.users.length, 0);

  return (
    <div className="min-h-screen text-stone-900 relative flex flex-col font-sans bg-transparent">

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-stone-200/80 bg-white/90 px-6 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-tr from-[#f25c54] via-[#f27059] to-[#f7b267] shadow-md shadow-orange-500/20">
            <Icons.Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-stone-950 md:text-base">
              Palmera <span className="text-[#f27059]">Superadmin</span>
            </h1>
            <span className="text-[9px] text-stone-500 uppercase tracking-widest block font-bold">
              Consola Global de Instancias
            </span>
          </div>
        </div>

          <a
            href="/admin"
            className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 hover:bg-stone-200/70 px-3 text-[11px] font-bold text-stone-600 transition-all cursor-pointer shadow-xs"
          >
            <Icons.Palmtree className="h-4 w-4 text-[#f27059]" />
            <span>ERP</span>
          </a>
      </header>

      {/* Toast Alert popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-linear-to-r from-[#f4845f] to-[#f25c54] text-white font-bold text-xs py-3.5 px-6 rounded-2xl shadow-xl shadow-orange-500/10 border border-white/20 flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-300">
          <Icons.CheckCircle className="h-4.5 w-4.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 z-10">
        
        {/* Navigation Tabs */}
        <div className="flex items-center bg-white rounded-2xl p-1.5 border border-stone-200/40 shadow-sm gap-1.5 overflow-x-auto scrollbar-none max-w-max">
          {[
            { id: "resumen", label: "Resumen", icon: Icons.TrendingUp },
            { id: "instancias", label: "Instancias", icon: Icons.Server },
            { id: "logs", label: "Log Global", icon: Icons.Activity },
            { id: "invitaciones", label: "Invitaciones", icon: Icons.MailOpen }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2.5 px-4.5 text-xs font-bold transition-all rounded-xl cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-tr from-[#f25c54] to-[#f7b267] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-stone-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <Icons.Loader2 className="h-8 w-8 text-[#f27059] animate-spin" />
          </div>
        ) : (
          <>
            {/* TABS 1: RESUMEN */}
            {activeTab === "resumen" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  
                  {/* Instancias Totales */}
                  <div className="bg-white/90 border border-stone-200/80 p-5 rounded-2xl shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        Instancias Totales
                      </span>
                      <Icons.Server className="h-5 w-5 text-[#f27059]" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-stone-950">{tenants.length}</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        Activas: {activeCount}
                      </span>
                    </div>
                  </div>

                  {/* Usuarios Creados */}
                  <div className="bg-white/90 border border-stone-200/80 p-5 rounded-2xl shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        Usuarios Creados
                      </span>
                      <Icons.Users className="h-5 w-5 text-[#f4845f]" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-stone-950">{totalUsers}</span>
                      <span className="text-[10px] text-stone-500">Promedio: {(totalUsers / (tenants.length || 1)).toFixed(1)}/inst</span>
                    </div>
                  </div>

                  {/* Logs de Operacion */}
                  <div className="bg-white/90 border border-stone-200/80 p-5 rounded-2xl shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        Logs de Operación
                      </span>
                      <Icons.Activity className="h-5 w-5 text-[#f79d65]" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-stone-950">{auditLogs.length}</span>
                      <span className="text-[10px] text-[#f25c54] font-bold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                        En tiempo real
                      </span>
                    </div>
                  </div>

                  {/* Estado Servidor */}
                  <div className="bg-white/90 border border-stone-200/80 p-5 rounded-2xl shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        Estado del Servidor
                      </span>
                      <Icons.HeartPulse className="h-5 w-5 text-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-stone-950">99.9%</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        ONLINE
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Recent Activity Mini-Feed */}
                  <div className="bg-white/80 border border-stone-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
                    <h3 className="text-xs font-black text-stone-950 tracking-widest uppercase flex items-center gap-2">
                      <Icons.Bell className="h-4 w-4 text-[#f25c54]" />
                      <span>Actividad Reciente en Instancias</span>
                    </h3>
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                      {auditLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex gap-3 text-xs border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                          <div className="h-7 w-7 rounded-lg bg-stone-100 text-[#f27059] flex items-center justify-center font-bold shrink-0">
                            {String((log as any).tenant ?? (log as any).tenantId ?? "??").substring(0, 2).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-stone-700 leading-normal">
                              {log.details}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-stone-400">
                              <span className="font-extrabold text-[#f4845f] uppercase">{log.action}</span>
                              <span>•</span>
                              <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Details */}
                  <div className="bg-white/80 border border-stone-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
                    <h3 className="text-xs font-black text-stone-950 tracking-widest uppercase flex items-center gap-2">
                      <Icons.ShieldCheck className="h-4 w-4 text-[#f27059]" />
                      <span>Control de Licencias & Tenants</span>
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Esta interfaz representa el panel central de gestión del ERP. Aquí puedes suspender instancias en mora, generar nuevos tokens únicos de registro y rastrear cada acción administrativa a través de la infraestructura compartida.
                    </p>
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500">Base de Datos:</span>
                        <span className="font-mono text-stone-900 font-semibold">PostgreSQL (Tenant Filtered)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500">Última Sincronización:</span>
                        <span className="font-mono text-emerald-600 font-semibold">Hace unos segundos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TABS 2: INSTANCIAS */}
            {activeTab === "instancias" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <SmartSearchInput value={tenantSearch} onChange={setTenantSearch} suggestions={tenants.flatMap((tenant) => [tenant.name, tenant.slug, tenant.domain ?? ""])} placeholder="Filtrar por nombre o subdominio..." className="max-w-sm flex-1" />
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">{activeCount} activas</span>
                      <span className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">{tenants.length - activeCount} suspendidas</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateError(null);
                        setShowCreateModal(true);
                      }}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-tr from-[#f25c54] to-[#f79d65] px-4 text-xs font-black text-white shadow-md shadow-orange-500/10 hover:from-[#f27059] hover:to-[#f7b267] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Icons.Plus className="h-4 w-4" />
                      <span>Crear instancia</span>
                    </button>
                  </div>
                </div>

                {/* Grid of Tenants */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className={`flex flex-col justify-between bg-white border p-5 rounded-2xl shadow-xs transition-all duration-300 ${
                        tenant.isActive
                          ? "border-[#f7b267]/60 hover:border-[#f27059] bg-gradient-to-b from-white to-[#f7b267]/5"
                          : "border-rose-200 bg-rose-50/10"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-black text-stone-950 tracking-tight">
                              {tenant.name}
                            </h3>
                            <a
                              href={getInstanceUrl(tenant.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-[#f27059] hover:text-[#f25c54] hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <span>{tenant.slug}.palmera.io</span>
                              <Icons.ExternalLink className="h-3 w-3" />
                            </a>
                          </div>

                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            tenant.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {tenant.isActive ? "Activo" : "Suspendido"}
                          </span>
                        </div>

                        <div className="space-y-2 text-[11px] text-stone-600">
                          <div className="flex justify-between">
                            <span>BBDD:</span>
                            <span className="font-mono text-stone-900 font-semibold">{getInstanceDatabaseName(tenant.slug)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Mantenimiento:</span>
                            <span className={`font-bold ${isMaintenanceEnabled(tenant) ? "text-orange-600" : "text-emerald-600"}`}>
                              {isMaintenanceEnabled(tenant) ? "Activo" : "No"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fecha Alta:</span>
                            <span className="text-stone-900 font-semibold">{new Date(tenant.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Usuarios en Instancia:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-stone-900 font-black">{tenant.users.length}</span>
                              <button
                                onClick={() => handleOpenUsersModal(tenant)}
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#f27059] hover:text-[#f25c54] hover:underline cursor-pointer"
                              >
                                <Icons.UserCog className="h-3.5 w-3.5" />
                                <span>Gestionar</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {tenant.users.length > 0 && (
                          <div className="border-t border-stone-100 pt-3 space-y-2">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                              Usuarios Registrados
                            </span>
                            <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-1">
                              {tenant.users.map((u) => (
                                <div key={u.id} className="flex justify-between items-center text-[10px]">
                                  <span className="text-stone-900 font-semibold truncate max-w-[110px]">{u.name}</span>
                                  <span className="text-stone-500 truncate max-w-[130px]">{u.email}</span>
                                  <span className="px-1.5 py-0.2 bg-stone-100 border border-stone-200 rounded-sm text-[8px] text-stone-600 font-bold font-mono">
                                    {u.role}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-stone-100 pt-4 mt-5 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openInstanceManagement(tenant)}
                          className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 text-[10px] font-bold text-stone-700 transition-all hover:bg-stone-100 cursor-pointer"
                        >
                          <Icons.Settings2 className="h-3.5 w-3.5" />
                          <span>Gestionar</span>
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => handleQuickAccess(e, tenant)}
                            className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg bg-stone-900 text-white px-3 text-[10px] font-bold transition-all hover:bg-stone-800 cursor-pointer w-full"
                          >
                            <Icons.ExternalLink className="h-3.5 w-3.5" />
                            <span>Acceder</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleTenant(tenant.id)}
                          className={`inline-flex h-8.5 items-center justify-center px-3 rounded-lg text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                            tenant.isActive
                              ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          {tenant.isActive ? "Suspender Instancia" : "Activar Instancia"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleMaintenance(tenant)}
                          className={`inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border px-3 text-[10px] font-bold transition-all cursor-pointer ${
                            isMaintenanceEnabled(tenant)
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                          }`}
                        >
                          <Icons.Wrench className="h-3.5 w-3.5" />
                          <span>{isMaintenanceEnabled(tenant) ? "Quitar Mant." : "Mantenimiento"}</span>
                        </button>

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABS 3: LOG GLOBAL */}
            {activeTab === "logs" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <SmartSearchInput value={logSearch} onChange={setLogSearch} suggestions={auditLogs.flatMap((log: any) => [log.action, log.tenant ?? log.tenantId ?? "", log.details, log.ipAddress ?? ""])} placeholder="Buscar por acción, detalles, IP..." className="max-w-sm flex-1" />
                </div>

                {/* Audit Logs Table */}
                <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Instancia (Tenant)</th>
                        <th className="py-3 px-4">Acción</th>
                        <th className="py-3 px-4">Mensaje / Detalle</th>
                        <th className="py-3 px-4">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-xs">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                          <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-black text-[#f25c54] uppercase whitespace-nowrap">
                            {(log as any).tenant ?? (log as any).tenantId ?? "—"}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-stone-850 max-w-sm truncate" title={log.details}>
                            {log.details}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-stone-400 whitespace-nowrap">
                            {log.ipAddress}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TABS 4: INVITACIONES */}
            {activeTab === "invitaciones" && (
              <div className="grid gap-6 md:grid-cols-5 animate-in fade-in duration-200">
                
                {/* Generate Form */}
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs space-y-4">
                    <h3 className="text-xs font-black text-stone-950 tracking-widest uppercase flex items-center gap-1.5">
                      <Icons.MailPlus className="h-4.5 w-4.5 text-[#f27059]" />
                      <span>Crear Invitación</span>
                    </h3>

                    <form onSubmit={handleGenerateInvite} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-500 uppercase">Nombre del Cliente</label>
                        <input
                          type="text"
                          required
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          placeholder="Carlos Gómez"
                          disabled={inviteLoading}
                          className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 px-3 text-xs text-stone-900 placeholder-stone-400 outline-hidden focus:border-[#f27059]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-500 uppercase">Email del Cliente</label>
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="carlos@gomez.com"
                          disabled={inviteLoading}
                          className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 px-3 text-xs text-stone-900 placeholder-stone-400 outline-hidden focus:border-[#f27059]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-500 uppercase">Nombre de Empresa (Opcional)</label>
                        <input
                          type="text"
                          value={inviteCompany}
                          onChange={(e) => setInviteCompany(e.target.value)}
                          placeholder="Gómez Eventos"
                          disabled={inviteLoading}
                          className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 px-3 text-xs text-stone-900 placeholder-stone-400 outline-hidden focus:border-[#f27059]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={inviteLoading}
                        className="w-full inline-flex h-9.5 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-tr from-[#f25c54] to-[#f79d65] hover:from-[#f27059] hover:to-[#f7b267] font-bold text-white shadow-md shadow-orange-500/10 transition-all active:scale-98 cursor-pointer disabled:opacity-50 text-xs"
                      >
                        {inviteLoading ? (
                          <Icons.Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                          <>
                            <Icons.Link className="h-4 w-4" />
                            <span>Generar Enlace Único</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {generatedLink && (
                    <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-xs space-y-3 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                        <Icons.CheckCircle className="h-4.5 w-4.5" />
                        <span>¡Enlace Generado Exitosamente!</span>
                      </div>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        Envía este enlace único al cliente para que inicie la configuración de su nueva plataforma.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedLink}
                          className="flex-1 bg-white border border-emerald-250 text-[10px] font-mono px-3 py-2 rounded-xl text-emerald-800 outline-hidden"
                        />
                        <button
                          onClick={() => copyToClipboard(generatedLink)}
                          className="px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                          title="Copiar"
                        >
                          <Icons.Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Invitations Table */}
                <div className="md:col-span-3 space-y-4">
                  <div className="bg-white border border-stone-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
                    <h3 className="text-xs font-black text-stone-950 tracking-widest uppercase">
                      Invitaciones Generadas
                    </h3>

                    <div className="overflow-x-auto rounded-xl border border-stone-150">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-stone-200 bg-stone-50 text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                            <th className="py-2.5 px-3">Código</th>
                            <th className="py-2.5 px-3">Cliente</th>
                            <th className="py-2.5 px-3">Empresa</th>
                            <th className="py-2.5 px-3">Estado</th>
                            <th className="py-2.5 px-3">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-[11px]">
                          {invitations.map((inv) => (
                            <tr key={inv.code} className="hover:bg-stone-50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-[#f25c54]">
                                {inv.code}
                              </td>
                              <td className="py-3 px-3 text-stone-900">
                                <div>{inv.recipientName}</div>
                                <div className="text-[10px] text-stone-400">{inv.recipientEmail}</div>
                              </td>
                              <td className="py-3 px-3 text-stone-500">
                                {inv.companyName || "—"}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                  inv.isUsed
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-orange-50 text-[#f27059] border-orange-200"
                                }`}>
                                  {inv.isUsed ? "Utilizado" : "Pendiente"}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-stone-400 whitespace-nowrap">
                                {new Date(inv.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* USER MANAGEMENT MODAL */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl relative space-y-6 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="flex justify-between items-start border-b border-stone-150 pb-4 shrink-0">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-base font-black text-stone-950 flex items-center gap-2">
                    <Icons.UserCog className="h-5 w-5 text-[#f27059]" />
                    <span>Gestionar Usuarios: <span className="text-[#f4845f]">{selectedTenant.name}</span></span>
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    Modifica, elimina, genera contraseñas seguras o añade miembros para {selectedTenant.slug}.palmera.io.
                  </p>
                </div>
                {selectedUserForAccess && (
                  <button
                    onClick={() => handleUserAccess(selectedUserForAccess, selectedTenant)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 text-[10px] font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-sm"
                  >
                    <Icons.LogIn className="h-3 w-3" />
                    <span>Acceder como Usuario</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              
              {/* Users List */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-[#f25c54] uppercase tracking-widest block">
                  Usuarios Actuales ({editableUsers.length})
                </span>

                {editableUsers.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-stone-200 rounded-2xl text-xs text-stone-550">
                    No hay usuarios registrados en esta instancia.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editableUsers.map((user) => (
                      <div
                        key={user.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-stone-50 border border-stone-200 p-4 rounded-2xl"
                      >
                        {/* Name */}
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Nombre</label>
                          <input
                            type="text"
                            value={user.name}
                            onChange={(e) => handleEditUserField(user.id, "name", e.target.value)}
                            className="w-full rounded-lg border border-stone-200 bg-white py-1.5 px-3 text-xs text-stone-900 outline-hidden focus:border-[#f27059]"
                          />
                        </div>

                        {/* Email */}
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Email</label>
                          <input
                            type="email"
                            value={user.email}
                            onChange={(e) => handleEditUserField(user.id, "email", e.target.value)}
                            className="w-full rounded-lg border border-stone-200 bg-white py-1.5 px-3 text-xs text-stone-900 outline-hidden focus:border-[#f27059] font-mono"
                          />
                        </div>

                        {/* Role */}
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Rol</label>
                          <select
                            value={user.role}
                            onChange={(e) => handleEditUserField(user.id, "role", e.target.value)}
                            className="w-full rounded-lg border border-stone-200 bg-white py-1.5 px-2 text-xs text-stone-900 outline-hidden focus:border-[#f27059]"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="STAFF">STAFF</option>
                          </select>
                        </div>

                        {/* Password Management */}
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block mb-0.5">Contraseña</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              readOnly
                              value={user.password || "••••••••"}
                              className="flex-1 rounded-lg border border-stone-200 bg-stone-100 py-1.5 px-2 text-[10px] text-[#f27059] font-mono outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleGeneratePasswordForUser(user.id)}
                              className="px-2.5 rounded-lg bg-[#f7b267]/10 text-[#f27059] border border-[#f7b267]/30 text-[10px] font-black hover:bg-[#f7b267]/25 transition-all cursor-pointer flex items-center justify-center gap-1"
                              title="Generar contraseña segura aleatoria y mandar email"
                            >
                              <Icons.KeyRound className="h-3.5 w-3.5" />
                              <span>Generar</span>
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1 flex justify-end md:justify-center pt-3 md:pt-4">
                          <button
                            type="button"
                            onClick={() => handleDeleteUserFromEditable(user.id)}
                            className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Icons.Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add User form */}
              <div className="border-t border-stone-150 pt-5 space-y-3">
                <span className="text-[10px] font-black text-[#f25c54] uppercase tracking-widest block">
                  Añadir Nuevo Miembro
                </span>

                <form onSubmit={handleAddUserToEditable} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[9px] font-bold text-stone-500 uppercase">Nombre Completo</label>
                    <input
                      type="text"
                      placeholder="Ej. Ana Belén"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 px-3 text-xs text-stone-900 outline-hidden focus:border-[#f27059]"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[9px] font-bold text-stone-500 uppercase">Email corporativo</label>
                    <input
                      type="email"
                      placeholder="ana@gastroshows.es"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 px-3 text-xs text-stone-900 outline-hidden focus:border-[#f27059] font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-stone-500 uppercase">Rol en Instancia</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 px-2 text-xs text-stone-900 outline-hidden focus:border-[#f27059]"
                    >
                      <option value="STAFF">STAFF</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  {/* Password option */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-stone-500 uppercase flex items-center justify-between">
                      <span>Contraseña</span>
                      <button
                        type="button"
                        onClick={() => setNewUserPassword(generateSecurePassword())}
                        className="text-[9px] text-[#f27059] font-black hover:underline cursor-pointer"
                      >
                        Autogenerar
                      </button>
                    </label>
                    <input
                      type="text"
                      placeholder="Vacío = Autogenerada"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 px-3 text-xs text-stone-900 outline-hidden focus:border-[#f27059] font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="sm:col-span-2 inline-flex h-8.5 items-center justify-center gap-1 rounded-lg bg-stone-900 text-white font-bold text-xs hover:bg-stone-850 transition-all cursor-pointer w-full"
                  >
                    <Icons.Plus className="h-4 w-4 text-[#f7b267]" />
                    <span>Añadir</span>
                  </button>
                </form>
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 border-t border-stone-150 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTenant(null)}
                className="h-9 px-4 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveUsers}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-tr from-[#f25c54] to-[#f79d65] hover:from-[#f27059] hover:to-[#f7b267] font-bold text-white shadow-md shadow-orange-500/10 transition-all active:scale-98 cursor-pointer px-5 text-xs"
              >
                <Icons.Save className="h-4 w-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INSTANCE MANAGEMENT MODAL */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-3xl bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl relative space-y-5 overflow-hidden">
            <div className="flex items-start justify-between border-b border-stone-150 pb-4">
              <div>
                <h2 className="text-base font-black text-stone-950 flex items-center gap-2">
                  <Icons.ServerCog className="h-5 w-5 text-[#f27059]" />
                  <span>Gestionar instancia</span>
                </h2>
                <p className="text-[11px] text-stone-500 font-mono">
                  {selectedInstance.slug}.palmera.io
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInstance(null)}
                className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-5">
              <div className="md:col-span-3 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Nombre visible</span>
                    <input
                      value={instanceName}
                      onChange={(event) => setInstanceName(event.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-semibold text-stone-900 outline-hidden focus:border-[#f27059]"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Dominio</span>
                    <input
                      value={instanceDomain}
                      onChange={(event) => setInstanceDomain(event.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-mono text-stone-900 outline-hidden focus:border-[#f27059]"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-black text-stone-950">Modo mantenimiento</h3>
                      <p className="text-[11px] leading-relaxed text-stone-500">Pausa el acceso operativo mientras se revisa la instancia.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleMaintenance(selectedInstance)}
                      className={`inline-flex h-8.5 min-w-24 items-center justify-center rounded-lg border px-3 text-[10px] font-bold transition-all cursor-pointer ${
                        isMaintenanceEnabled(selectedInstance)
                          ? "border-orange-200 bg-orange-50 text-orange-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isMaintenanceEnabled(selectedInstance) ? "Activado" : "Normal"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-black text-stone-950">Comando de aprovisionamiento</h3>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(getProvisionCommand(selectedInstance))}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
                    >
                      <Icons.Copy className="h-3.5 w-3.5" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-xl bg-stone-950 p-3 text-[10px] leading-5 text-stone-100">{getProvisionCommand(selectedInstance)}</pre>
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Slug</span>
                    <span className="font-mono font-bold text-stone-950">{selectedInstance.slug}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">BBDD</span>
                    <span className="font-mono font-bold text-stone-950">{getInstanceDatabaseName(selectedInstance.slug)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Usuarios</span>
                    <span className="font-black text-stone-950">{selectedInstance.users.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Estado</span>
                    <span className={selectedInstance.isActive ? "font-bold text-emerald-700" : "font-bold text-rose-700"}>
                      {selectedInstance.isActive ? "Activa" : "Suspendida"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(getInstanceUrl(selectedInstance.slug))}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  <Icons.Link className="h-4 w-4 text-[#f27059]" />
                  <span>Copiar URL de acceso</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInstance(null);
                    handleOpenUsersModal(selectedInstance);
                  }}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  <Icons.UserCog className="h-4 w-4 text-[#f27059]" />
                  <span>Gestionar usuarios</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(selectedInstance);
                    setDeletePhrase("");
                    setSelectedInstance(null);
                  }}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  <Icons.Trash2 className="h-4 w-4" />
                  <span>Eliminar instancia</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-150 pt-4">
              <button
                type="button"
                onClick={() => setSelectedInstance(null)}
                className="h-9 rounded-xl border border-stone-200 bg-stone-50 px-4 text-xs font-bold text-stone-600 hover:bg-stone-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveInstance}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-tr from-[#f25c54] to-[#f79d65] px-5 text-xs font-bold text-white shadow-md shadow-orange-500/10 hover:from-[#f27059] hover:to-[#f7b267]"
              >
                <Icons.Save className="h-4 w-4" />
                <span>Guardar instancia</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE INSTANCE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
                <Icons.TriangleAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-stone-950">Eliminar instancia</h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Esta acción elimina la instancia de Superadmin. En base real borra el tenant y sus datos relacionados por cascada.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800">
              Escribe <span className="font-mono font-black">{deleteTarget.slug}</span> para confirmar.
            </div>

            <input
              autoFocus
              value={deletePhrase}
              onChange={(event) => setDeletePhrase(event.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-mono text-stone-900 outline-hidden focus:border-rose-500"
              placeholder={deleteTarget.slug}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeletePhrase("");
                }}
                className="h-9 rounded-xl border border-stone-200 bg-stone-50 px-4 text-xs font-bold text-stone-600 hover:bg-stone-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletePhrase !== deleteTarget.slug}
                onClick={handleDeleteInstance}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icons.Trash2 className="h-4 w-4" />
                <span>Eliminar definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE INSTANCE MODAL — SAAS single-VPS */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-stone-150 pb-4">
              <div>
                <h2 className="text-base font-black text-stone-950 flex items-center gap-2">
                  <Icons.Plus className="h-5 w-5 text-[#f27059]" />
                  <span>Crear instancia SAAS</span>
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Se creará en <span className="font-mono font-bold text-stone-700">este mismo VPS</span> (DB <span className="font-mono">palmera_&lt;slug&gt;</span>). Subdominio <span className="font-mono">slug.palmera.io</span> vía proxy existente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInstance} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Nombre visible *</span>
                  <input
                    required
                    value={createData.name}
                    onChange={(e) => setCreateData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej. Gastroshows Barcelona"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-semibold text-stone-900 outline-hidden focus:border-[#f27059]"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Slug (subdominio) *</span>
                  <input
                    required
                    value={createData.slug}
                    onChange={(e) => setCreateData((p) => ({ ...p, slug: normalizeSlug(e.target.value) }))}
                    placeholder="ej. gastroshows"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-mono text-stone-900 outline-hidden focus:border-[#f27059]"
                  />
                  <span className="text-[9px] text-stone-400">a-z, 0-9, guiones. Mín. 3. Se normaliza automático.</span>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Admin — Nombre *</span>
                  <input
                    required
                    value={createData.adminName}
                    onChange={(e) => setCreateData((p) => ({ ...p, adminName: e.target.value }))}
                    placeholder="Ej. Ana García"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-semibold text-stone-900 outline-hidden focus:border-[#f27059]"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Admin — Email *</span>
                  <input
                    required
                    type="email"
                    value={createData.adminEmail}
                    onChange={(e) => setCreateData((p) => ({ ...p, adminEmail: e.target.value }))}
                    placeholder="admin@empresa.es"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-mono text-stone-900 outline-hidden focus:border-[#f27059]"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center justify-between">
                    <span>Admin — Contraseña</span>
                    <button
                      type="button"
                      onClick={() => setCreateData((p) => ({ ...p, adminPassword: generateSecurePassword() }))}
                      className="text-[9px] font-black text-[#f27059] hover:underline cursor-pointer"
                    >
                      Autogenerar
                    </button>
                  </span>
                  <input
                    value={createData.adminPassword}
                    onChange={(e) => setCreateData((p) => ({ ...p, adminPassword: e.target.value }))}
                    placeholder="Vacío = autogenerada"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-mono text-stone-900 outline-hidden focus:border-[#f27059]"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Dominio (opcional)</span>
                  <input
                    value={createData.domain}
                    onChange={(e) => setCreateData((p) => ({ ...p, domain: e.target.value }))}
                    placeholder="ej. gastroshows.palmera.io"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-mono text-stone-900 outline-hidden focus:border-[#f27059]"
                  />
                  <span className="text-[9px] text-stone-400">Vacío = {createData.slug ? `${createData.slug}.palmera.io` : "slug.palmera.io"} en este VPS.</span>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Zona horaria</span>
                  <select
                    value={createData.timezone}
                    onChange={(e) => setCreateData((p) => ({ ...p, timezone: e.target.value }))}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-semibold text-stone-900 outline-hidden focus:border-[#f27059]"
                  >
                    <option value="Europe/Madrid">Europe/Madrid</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="America/Mexico_City">America/Mexico_City</option>
                    <option value="America/Bogota">America/Bogota</option>
                    <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Sectores iniciales (CSV)</span>
                  <input
                    value={createData.modes}
                    onChange={(e) => setCreateData((p) => ({ ...p, modes: e.target.value }))}
                    placeholder="VENTAS,COMUNICACION,GESTION_PROYECTOS"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-mono text-stone-900 outline-hidden focus:border-[#f27059]"
                  />
                  <span className="text-[9px] text-stone-400">IDs de PalmModesRegistry. Ej. RESTAURANTE,GESTION_EQUIPO.</span>
                </label>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                <span className="font-black">SAAS en este VPS:</span> crea la base <span className="font-mono">palmera_{normalizeSlug(createData.slug) || "slug"}</span> en el mismo Postgres (`PALMERA_PLATFORM_DATABASE_URL`) y ejecuta `prisma db push` + seed. Preparado para multi-server futuro, pero ahora todo queda en el mismo dominio.
              </div>

              {createError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
                  <div className="text-xs font-bold text-rose-700 flex items-start gap-2">
                    <Icons.TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="flex-1 break-words">{createError}</span>
                  </div>
                  {createTechnical && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowErrorModal(true)}
                        className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-2.5 text-[10px] font-black text-rose-700 hover:bg-rose-100 cursor-pointer"
                      >
                        <Icons.Bug className="h-3.5 w-3.5" />
                        Ver detalles técnicos
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createTechnical);
                          showToast("Detalles técnicos copiados.");
                        }}
                        className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 text-[10px] font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
                      >
                        <Icons.Copy className="h-3.5 w-3.5" />
                        Copiar
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-stone-150 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-9 rounded-xl border border-stone-200 bg-stone-50 px-4 text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-tr from-[#f25c54] to-[#f79d65] px-5 text-xs font-black text-white shadow-md shadow-orange-500/10 hover:from-[#f27059] hover:to-[#f7b267] disabled:opacity-50 cursor-pointer"
                >
                  {createLoading ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Plus className="h-4 w-4" />}
                  <span>{createLoading ? "Creando…" : "Crear en este VPS"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ERROR TECHNICAL DETAILS POP-UP (copy for IA) */}
      {showErrorModal && createError && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-rose-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-rose-100 bg-rose-50 px-6 py-4">
              <div className="flex gap-3">
                <div className="rounded-xl bg-rose-600 p-2.5 text-white shadow-sm">
                  <Icons.Bug className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-rose-950">Error técnico — Detalles para depuración</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-rose-700">
                    Copia este bloque completo y envíaselo a la IA. Incluye payload, respuesta del servidor, stack y causa del AggregateError.
                  </p>
                  <p className="mt-1 font-mono text-[11px] font-bold text-rose-800 break-words">{createError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="rounded-lg bg-white p-1.5 text-stone-500 hover:text-stone-900 border border-stone-200 cursor-pointer"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-stone-950 p-4">
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-4 text-emerald-100">
                {createTechnical || "Sin detalles técnicos capturados."}
              </pre>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-white px-6 py-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Tip: el campo adminPassword está enmascarado como ***
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (createTechnical) navigator.clipboard.writeText(createTechnical);
                    showToast("Detalles copiados — pégalos a la IA.");
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-900 px-4 text-xs font-bold text-white hover:bg-stone-800 cursor-pointer"
                >
                  <Icons.Copy className="h-4 w-4" />
                  Copiar detalles
                </button>
                <button
                  type="button"
                  onClick={() => setShowErrorModal(false)}
                  className="h-8 rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED EMAIL SENT NOTIFICATION OVERLAY */}
      {showEmailModal && emailDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white border border-[#f4845f]/40 rounded-3xl p-6 shadow-2xl relative space-y-4">
            
            <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-250 px-3 py-1 text-[10px] font-bold text-[#f27059]">
              <Icons.Send className="h-3 w-3 animate-bounce" />
              <span>Simulación de Servidor de Correo (SMTP Outbox)</span>
            </div>

            <div className="rounded-2xl bg-stone-50 border border-stone-200 overflow-hidden text-xs shadow-xs">
              <div className="bg-stone-100 p-3.5 border-b border-stone-200 space-y-1.5">
                <div className="flex text-stone-500">
                  <span className="w-16 font-bold uppercase text-[9px]">De:</span>
                  <span className="text-stone-850">Palm Onboarding Service &lt;no-reply@palmera.io&gt;</span>
                </div>
                <div className="flex text-stone-500">
                  <span className="w-16 font-bold uppercase text-[9px]">Para:</span>
                  <span className="text-[#f25c54] font-bold">{emailDetails.name} &lt;{emailDetails.to}&gt;</span>
                </div>
                <div className="flex text-stone-500">
                  <span className="w-16 font-bold uppercase text-[9px]">Asunto:</span>
                  <span className="text-stone-950 font-black">Bienvenido a Palmera - Configura tu contraseña de acceso</span>
                </div>
              </div>

              <div className="p-4 space-y-4 text-stone-700 font-sans leading-relaxed text-[11px]">
                <p>Hola <strong>{emailDetails.name}</strong>,</p>
                
                <p>
                  Te damos la bienvenida a tu nuevo espacio de trabajo en la instancia <strong>{emailDetails.tenantSlug}</strong> de Palmera.
                </p>

                <div className="p-3.5 rounded-xl bg-white border border-stone-200/80 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Tu Nivel de Acceso:</span>
                    <span className="font-bold text-[#f25c54] font-mono text-[9px]">{emailDetails.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Contraseña Segura Autogenerada:</span>
                    <span className="font-mono font-bold text-[#f27059] bg-[#f7b267]/10 px-1.5 py-0.5 rounded border border-[#f7b267]/20">{emailDetails.tempPassword}</span>
                  </div>
                </div>

                <p>
                  Para empezar a trabajar con nosotros, haz clic en el siguiente enlace para activar tu cuenta y configurar tu contraseña de primer acceso:
                </p>

                <div className="text-center py-2">
                  <a
                    href={emailDetails.accessLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-tr from-[#f25c54] to-[#f79d65] hover:from-[#f27059] hover:to-[#f7b267] font-bold text-white transition-all px-5 text-[10.5px] shadow-xs"
                  >
                    <span>Configurar Contraseña y Acceder</span>
                    <Icons.ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="text-[10px] text-stone-400 border-t border-stone-200 pt-3 font-mono break-all leading-normal">
                  URL de enlace directo: <br/>
                  <span className="text-[#f25c54]/80">{emailDetails.accessLink}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="h-8.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all cursor-pointer border border-stone-250"
              >
                Cerrar simulación
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ACCESS QUICK MENU */}
      {accessMenuOpen && (
        <div 
          className="fixed z-[200] bg-white border border-stone-200 shadow-2xl rounded-2xl p-1.5 w-48 animate-in zoom-in-95 duration-100"
          style={{ top: accessMenuOpen.y, left: accessMenuOpen.x }}
        >
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                const tenant = tenants.find(t => t.id === accessMenuOpen.tenantId);
                if (tenant) handleAdminAccess(tenant);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-all cursor-pointer"
            >
              <Icons.ShieldCheck className="h-4 w-4 text-emerald-500" />
              Acceder como Admin
            </button>
            <button
              onClick={() => {
                const tenant = tenants.find(t => t.id === accessMenuOpen.tenantId);
                if (tenant) {
                  setSelectedUserForAccess(tenant.users[0] || null);
                  setSelectedTenant(tenant);
                  handleOpenUsersModal(tenant);
                }
                setAccessMenuOpen(null);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-all cursor-pointer"
            >
              <Icons.Users className="h-4 w-4 text-blue-500" />
              Escoger Usuario
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
