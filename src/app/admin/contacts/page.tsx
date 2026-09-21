"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey, getTenantSlugClient } from "@/lib/clientStorage";
import { isTenantDataCleared } from "@/lib/demoDataCleanup";
import EditableLabel from "@/components/admin/EditableLabel";
import SmartSearchInput from "@/components/SmartSearchInput";

// 1. Interfaces & Demo Data
interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactType: "INDIVIDUAL" | "COMPANY";
  companyName?: string;
  cif?: string;
  customGreeting?: string; // Personalized Greeting Template
  billingStreet?: string;
  billingZip?: string;
  billingCity?: string;
  billingCountry?: string;
  notes?: string;
  birthDate?: string;
  createdAt: string;
}

const initialDemoContacts: Contact[] = [
  {
    id: "c1",
    name: "Gastroshows Barcelona SL",
    email: "info@gastroshows.es",
    phone: "+34 932 456 789",
    contactType: "COMPANY",
    cif: "B66778899",
    customGreeting: "Estimados compañeros",
    billingStreet: "Passeig de Gràcia 45",
    billingZip: "08007",
    billingCity: "Barcelona",
    billingCountry: "España",
    notes: "Socio comercial principal de restauración en Barcelona.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c2",
    name: "Renato García",
    email: "renato@gastroshows.es",
    phone: "+34 600 112 233",
    contactType: "INDIVIDUAL",
    companyName: "Gastroshows Barcelona SL",
    cif: "45678912K",
    customGreeting: "Hey", // Prefilled for Renato (Brother context: "Hey, mañana tienes...")
    billingStreet: "Carrer de Balmes 102",
    billingZip: "08008",
    billingCity: "Barcelona",
    billingCountry: "España",
    notes: "Contacto administrativo y líder de IT.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c3",
    name: "Lucía Fernández",
    email: "lucia@empresaX.com",
    phone: "+34 677 889 900",
    contactType: "INDIVIDUAL",
    companyName: "Tecnologías del Sur SA",
    cif: "78912345T",
    customGreeting: "Querida Silvia", // Prefilled for Silvia role (Operations: "Querida Silvia, necesito...")
    billingStreet: "Avenida de la Constitución 12",
    billingZip: "41001",
    billingCity: "Sevilla",
    billingCountry: "España",
    notes: "Directora de operaciones. Cliente VIP interesado en soluciones ERP modulares.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c4",
    name: "Tecnologías del Sur SA",
    email: "contacto@tecnologiasdelsur.com",
    phone: "+34 954 123 456",
    contactType: "COMPANY",
    cif: "A41002003",
    customGreeting: "Estimado equipo de Tecnologías del Sur",
    billingStreet: "Parque Tecnológico Cartuja, Local 4",
    billingZip: "41092",
    billingCity: "Sevilla",
    billingCountry: "España",
    notes: "Consultora tecnológica de la zona sur.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c5",
    name: "Carlos Ortega",
    email: "carlos.ortega@gmail.com",
    phone: "+34 622 334 455",
    contactType: "INDIVIDUAL",
    cif: "23456789M",
    customGreeting: "Hola Carlos",
    billingStreet: "Calle Mayor 15",
    billingZip: "28013",
    billingCity: "Madrid",
    billingCountry: "España",
    notes: "Consultor independiente de software.",
    createdAt: new Date().toISOString(),
  }
];

const initialSport2LiveContacts: Contact[] = [
  {
    id: "c1-s2l",
    name: "Federación de Tenis",
    email: "info@fedetenis.org",
    phone: "+34 913 456 780",
    contactType: "COMPANY",
    cif: "A88372619",
    customGreeting: "Estimada Federación",
    billingStreet: "Calle de la Federación 3",
    billingZip: "28003",
    billingCity: "Madrid",
    billingCountry: "España",
    notes: "Contacto de colaboración para torneos.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c2-s2l",
    name: "Alex Ruiz",
    email: "alex@sport2live.com",
    phone: "+34 655 443 322",
    contactType: "INDIVIDUAL",
    companyName: "Sport2Live Club",
    cif: "54321098X",
    customGreeting: "Hola Alex",
    billingStreet: "Carrer del Deporte 12",
    billingZip: "08018",
    billingCity: "Barcelona",
    billingCountry: "España",
    notes: "Administrador de la instancia de Sport2Live.",
    createdAt: new Date().toISOString(),
  }
];

const getDemoContactsForTenant = (slug: string): Contact[] => {
  if (slug.toLowerCase() === "sport2live") {
    return initialSport2LiveContacts;
  }
  return initialDemoContacts;
};

type SortField = "name" | "email" | "contactType" | "cif";
type SortOrder = "asc" | "desc";

export default function ContactsPage() {
  // --- States ---
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "INDIVIDUAL" | "COMPANY">("ALL");
  const [filterWithCif, setFilterWithCif] = useState(false);
  const [groupByField, setGroupByField] = useState<"NONE" | "contactType" | "billingCity">("NONE");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Main CRUD Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Email Dispatcher Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailContact, setEmailContact] = useState<Contact | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<"operations" | "casual" | "custom">("casual");

  // Phone / WhatsApp Modal States
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneContact, setPhoneContact] = useState<Contact | null>(null);
  const [phoneActionType, setPhoneActionType] = useState<"CALL" | "WHATSAPP">("CALL");
  const [isCallingActive, setIsCallingActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [whatsappText, setWhatsappText] = useState("");
  const [activeWhatsappTemplate, setActiveWhatsappTemplate] = useState<"casual" | "operations" | "custom">("casual");

  // Floating Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    contactType: "INDIVIDUAL" as "INDIVIDUAL" | "COMPANY",
    companyName: "",
    cif: "",
    customGreeting: "",
    billingStreet: "",
    billingZip: "",
    billingCity: "",
    billingCountry: "España",
    notes: "",
    birthDate: "",
  });
  // --- Edu roles (alumno / tutor) leídos de la agenda educativa local ---
  const [eduRoles, setEduRoles] = useState<Record<string, { isStudent: boolean; tutorOf: string[] }>>({});
  useEffect(() => {
    try {
      const slug = getTenantSlugClient();
      const raw = localStorage.getItem(`palmera_edu_students_${slug}`) || localStorage.getItem(getTenantStorageKey("edu_students"));
      if (!raw) return;
      const arr: any[] = JSON.parse(raw);
      const map: Record<string, { isStudent: boolean; tutorOf: string[] }> = {};
      const mark = (key: string, patch: Partial<{ isStudent: boolean; tutorOf: string[] }>) => {
        if (!key) return;
        map[key] = map[key] || { isStudent: false, tutorOf: [] };
        if (patch.isStudent) map[key].isStudent = true;
        if (patch.tutorOf) map[key].tutorOf.push(...patch.tutorOf);
      };
      (Array.isArray(arr) ? arr : []).forEach((s: any) => {
        const sName = String(s.contactName || s.name || "");
        const sId = s.contactId ? String(s.contactId) : "";
        const tName = s.tutorName ? String(s.tutorName) : "";
        const tId = s.tutorId ? String(s.tutorId) : "";
        if (sId) mark(`id:${sId}`, { isStudent: true });
        if (sName) mark(`name:${sName.toLowerCase()}`, { isStudent: true });
        if (tId) mark(`id:${tId}`, { tutorOf: [sName] });
        if (tName) mark(`name:${tName.toLowerCase()}`, { tutorOf: [sName] });
      });
      setEduRoles(map);
    } catch {}
  }, [contacts.length]);

  // --- Call Active Timer Effect ---
  useEffect(() => {
    let interval: any = null;
    if (isCallingActive) {
      interval = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isCallingActive]);

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  // --- Load and Save from LocalStorage ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const slug = getTenantSlugClient();

      const storageKey = `palmera_contacts_${slug}`;
      if (isTenantDataCleared(slug)) {
        setContacts([]);
        return;
      }
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setContacts(JSON.parse(saved));
        } catch (e) {
          const demoContacts = getDemoContactsForTenant(slug);
          setContacts(demoContacts);
        }
      } else {
        const demoContacts = getDemoContactsForTenant(slug);
        setContacts(demoContacts);
        localStorage.setItem(storageKey, JSON.stringify(demoContacts));
      }
    }
  }, []);

  const saveContacts = (updated: Contact[]) => {
    setContacts(updated);
    if (typeof window !== "undefined") {
      const slug = getTenantSlugClient();
      localStorage.setItem(`palmera_contacts_${slug}`, JSON.stringify(updated));
    }
  };

  // --- Sorting Handler ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // --- Modal Openers ---
  const openCreateModal = () => {
    setEditingContact(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      contactType: "INDIVIDUAL",
      companyName: "",
      cif: "",
      customGreeting: "",
      billingStreet: "",
      billingZip: "",
      billingCity: "",
      billingCountry: "España",
      notes: "",
      birthDate: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone || "",
      contactType: contact.contactType,
      companyName: contact.companyName || "",
      cif: contact.cif || "",
      customGreeting: contact.customGreeting || "",
      billingStreet: contact.billingStreet || "",
      billingZip: contact.billingZip || "",
      billingCity: contact.billingCity || "",
      billingCountry: contact.billingCountry || "España",
      notes: contact.notes || "",
      birthDate: contact.birthDate || "",
    });
    setIsModalOpen(true);
  };

  // --- Delete Handler ---
  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este contacto?")) {
      const filtered = contacts.filter((c) => c.id !== id);
      saveContacts(filtered);
    }
  };

  // --- Submit Handler ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("El nombre es requerido");

    if (editingContact) {
      // Edit
      const updated = contacts.map((c) =>
        c.id === editingContact.id
          ? {
              ...c,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              contactType: formData.contactType,
              companyName: formData.contactType === "INDIVIDUAL" ? formData.companyName : "",
              cif: formData.cif,
              customGreeting: formData.customGreeting,
              billingStreet: formData.billingStreet,
              billingZip: formData.billingZip,
              billingCity: formData.billingCity,
              billingCountry: formData.billingCountry,
              notes: formData.notes,
              birthDate: formData.birthDate || undefined,
            }
          : c
      );
      saveContacts(updated);
    } else {
      // Create
      const newContact: Contact = {
        id: "c_" + Date.now(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        contactType: formData.contactType,
        companyName: formData.contactType === "INDIVIDUAL" ? formData.companyName : "",
        cif: formData.cif,
        customGreeting: formData.customGreeting,
        billingStreet: formData.billingStreet,
        billingZip: formData.billingZip,
        billingCity: formData.billingCity,
        billingCountry: formData.billingCountry,
        notes: formData.notes,
        birthDate: formData.birthDate || undefined,
        createdAt: new Date().toISOString(),
      };
      saveContacts([...contacts, newContact]);
    }
    setIsModalOpen(false);
  };

  // --- E-mail Dispatcher Pop-up logic ---
  const openEmailModal = (contact: Contact) => {
    setEmailContact(contact);
    setEmailSubject("Envío automático - Gestión Palm Core");
    
    // Choose greeting or fallback to standard greeting
    const greeting = contact.customGreeting || "Hola " + contact.name.split(" ")[0];
    
    // Generate casual template as default
    const defaultBody = `${greeting},\n\nmañana tienes listos los módulos de control en la consola de Palmera.\n\nQuedo a tu disposición,\nSoporte Técnico Palm`;
    
    setEmailBody(defaultBody);
    setActiveTemplate("casual");
    setIsEmailModalOpen(true);
  };

  // Switch between templates preserving custom greeting!
  const applyEmailTemplate = (templateName: "operations" | "casual" | "custom") => {
    if (!emailContact) return;
    const greeting = emailContact.customGreeting || "Hola " + emailContact.name.split(" ")[0];
    setActiveTemplate(templateName);
    
    if (templateName === "casual") {
      setEmailBody(`${greeting},\n\nmañana tienes listos los módulos de control en la consola de Palmera.\n\nUn fuerte abrazo.`);
    } else if (templateName === "operations") {
      setEmailBody(`${greeting},\n\nnecesito para mañana que revisemos el estado de las bases de datos del servidor y verifiquemos que compile todo en verde.\n\nAtentamente,\nDirección de Operaciones`);
    } else {
      setEmailBody(`${greeting},\n\n[Escribe tu correo personalizado aquí...]`);
    }
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingEmail(true);

    // Simulate sending email (SaaS Wow Effect loader!)
    setTimeout(() => {
      setIsSendingEmail(false);
      setIsEmailModalOpen(false);
      
      // 1. Success feedback toast
      setToastMessage(`¡E-mail enviado con éxito a ${emailContact?.email}!`);
      setTimeout(() => setToastMessage(null), 4000);

      // 2. Audit Log write (Simulate central database logging!)
      try {
        const auditLogSaved = localStorage.getItem("palmera_audit_logs") || "[]";
        const logs = JSON.parse(auditLogSaved);
        const newLog = {
          id: "log_" + Date.now(),
          action: "EMAIL_DISPATCHED",
          details: `Correo enviado a ${emailContact?.name} (${emailContact?.email}). Saludo: "${emailContact?.customGreeting || "Por defecto"}".`,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem("palmera_audit_logs", JSON.stringify([newLog, ...logs].slice(0, 10)));
      } catch (err) {
        console.error("Failed to write mock audit log", err);
      }
    }, 2000);
  };

  // --- Phone / WhatsApp Dispatcher pop-up logic ---
  const openPhoneDispatcher = (contact: Contact, type: "CALL" | "WHATSAPP") => {
    setPhoneContact(contact);
    setPhoneActionType(type);
    setIsCallingActive(false);
    setCallSeconds(0);

    const greeting = contact.customGreeting || "Hola " + contact.name.split(" ")[0];
    if (type === "WHATSAPP") {
      const defaultText = `${greeting},\n\nte he dejado los módulos listos en el ERP. ¡Avísame cuando los mires!`;
      setWhatsappText(defaultText);
      setActiveWhatsappTemplate("casual");
    } else {
      // Auto-dialing simulation
      setIsCallingActive(true);
    }
    setIsPhoneModalOpen(true);
  };

  const applyWhatsappTemplate = (templateName: "casual" | "operations" | "custom") => {
    if (!phoneContact) return;
    const greeting = phoneContact.customGreeting || "Hola " + phoneContact.name.split(" ")[0];
    setActiveWhatsappTemplate(templateName);

    if (templateName === "casual") {
      setWhatsappText(`${greeting},\n\nte he dejado los módulos listos en el ERP. ¡Avísame cuando los mires!`);
    } else if (templateName === "operations") {
      setWhatsappText(`${greeting},\n\nnecesito para mañana que le des prioridad al correo urgente que te acabo de mandar. ¡Muchas gracias!`);
    } else {
      setWhatsappText(`${greeting},\n\n[Escribe tu mensaje personalizado de WhatsApp aquí...]`);
    }
  };

  const handleSendWhatsapp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneContact) return;

    setIsSendingEmail(true); // Re-use loader state

    setTimeout(() => {
      setIsSendingEmail(false);
      setIsPhoneModalOpen(false);

      // Clean phone number (leave only digits and +)
      const cleanPhone = phoneContact.phone.replace(/[^\d+]/g, "");

      // 1. Success toast
      setToastMessage(`¡Mensaje de WhatsApp preparado para ${phoneContact.name}!`);
      setTimeout(() => setToastMessage(null), 4000);

      // 2. Audit Log write
      try {
        const auditLogSaved = localStorage.getItem("palmera_audit_logs") || "[]";
        const logs = JSON.parse(auditLogSaved);
        const newLog = {
          id: "log_" + Date.now(),
          action: "WHATSAPP_DISPATCHED",
          details: `WhatsApp enviado a ${phoneContact.name} (${phoneContact.phone}). Mensaje: "${whatsappText.slice(0, 45)}..."`,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem("palmera_audit_logs", JSON.stringify([newLog, ...logs].slice(0, 10)));
      } catch (err) {
        console.error("Failed to write mock audit log", err);
      }

      // 3. Open WhatsApp Web/API link
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(whatsappText)}`;
      window.open(whatsappUrl, "_blank");
    }, 1500);
  };

  const handleHangUp = () => {
    setIsCallingActive(false);
    setIsPhoneModalOpen(false);

    setToastMessage(`Llamada finalizada con ${phoneContact?.name} (Duración: ${formatCallTime(callSeconds)})`);
    setTimeout(() => setToastMessage(null), 4000);

    // Audit Log write
    try {
      const auditLogSaved = localStorage.getItem("palmera_audit_logs") || "[]";
      const logs = JSON.parse(auditLogSaved);
      const newLog = {
        id: "log_" + Date.now(),
        action: "PHONE_CALL_COMPLETED",
        details: `Llamada completada con ${phoneContact?.name} (${phoneContact?.phone}). Duración: ${formatCallTime(callSeconds)}.`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem("palmera_audit_logs", JSON.stringify([newLog, ...logs].slice(0, 10)));
    } catch (err) {
      console.error("Failed to write mock audit log", err);
    }
  };

  const triggerNativeCall = () => {
    if (!phoneContact) return;
    const cleanPhone = phoneContact.phone.replace(/[^\d+]/g, "");
    window.open(`tel:${cleanPhone}`, "_self");
  };

  // --- Filter and Sort Logic ---
  const filteredContacts = contacts
    .filter((c) => {
      // Text Search
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.cif && c.cif.toLowerCase().includes(query)) ||
        (c.billingCity && c.billingCity.toLowerCase().includes(query));

      // Type Filter
      const matchesType =
        filterType === "ALL" || c.contactType === filterType;

      // With CIF Filter
      const matchesCif = !filterWithCif || !!c.cif;

      return matchesSearch && matchesType && matchesCif;
    })
    .sort((a, b) => {
      let valA = a[sortField]?.toLowerCase() || "";
      let valB = b[sortField]?.toLowerCase() || "";

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // --- Row Rendering helper ---
  const renderTableRows = (list: Contact[]) => {
    return list.map((contact) => (
      <tr
        key={contact.id}
        className="group border-b border-border/40 hover:bg-muted/30 transition-all duration-150"
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold border transition-transform group-hover:scale-105 duration-200 ${
              contact.contactType === "COMPANY"
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            }`}>
              {contact.contactType === "COMPANY" ? (
                <Icons.Building2 className="h-4.5 w-4.5" />
              ) : (
                <Icons.User className="h-4.5 w-4.5" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">{contact.name}</span>
              {(() => {
                const role = eduRoles[`id:${contact.id}`] || eduRoles[`name:${contact.name.toLowerCase()}`];
                if (!role || (!role.isStudent && role.tutorOf.length === 0)) return null;
                return (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {role.isStudent && (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-px text-[9px] font-bold text-emerald-700">🎸 Alumno</span>
                    )}
                    {role.tutorOf.length > 0 && (
                      <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-1.5 py-px text-[9px] font-bold text-sky-700" title={`Tutor de: ${role.tutorOf.join(", ")}`}>
                        👨‍👩‍👧 Tutor{role.tutorOf.length > 1 ? ` ×${role.tutorOf.length}` : ""}
                      </span>
                    )}
                  </span>
                );
              })()}
              {contact.contactType === "INDIVIDUAL" && contact.companyName && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Icons.Briefcase className="h-3 w-3" />
                  {contact.companyName}
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
          {contact.email ? (
            <div className="flex items-center gap-2">
              <a href={`mailto:${contact.email}`} className="hover:text-red-500 transition-colors font-medium">
                {contact.email}
              </a>
              {/* Envelope Email dispatcher icon requested in custom mock red squares */}
              <button
                onClick={() => openEmailModal(contact)}
                className="text-muted-foreground hover:text-red-500 rounded-md p-1 hover:bg-muted/50 transition-all cursor-pointer scale-100 hover:scale-110 active:scale-95 duration-150"
                title={`Enviar e-mail personalizado con plantilla a ${contact.name}`}
              >
                <Icons.Mail className="h-3.5 w-3.5 text-red-500/60 hover:text-red-500" />
              </button>
            </div>
          ) : (
            "—"
          )}
        </td>
        <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
          {contact.phone ? (
            <div className="flex items-center gap-2">
              <span>{contact.phone}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {/* Phone Call Dispatcher */}
                <button
                  onClick={() => openPhoneDispatcher(contact, "CALL")}
                  className="text-muted-foreground hover:text-red-500 rounded-md p-1 hover:bg-muted/50 transition-all cursor-pointer scale-100 hover:scale-115 active:scale-90 duration-150"
                  title={`Llamar a ${contact.name}`}
                >
                  <Icons.PhoneCall className="h-3.5 w-3.5 text-red-500/60 hover:text-red-500" />
                </button>
                {/* WhatsApp Dispatcher */}
                <button
                  onClick={() => openPhoneDispatcher(contact, "WHATSAPP")}
                  className="text-muted-foreground hover:text-emerald-500 rounded-md p-1 hover:bg-muted/50 transition-all cursor-pointer scale-100 hover:scale-115 active:scale-90 duration-150"
                  title={`Enviar WhatsApp a ${contact.name}`}
                >
                  <Icons.MessageCircle className="h-3.5 w-3.5 text-emerald-500/60 hover:text-emerald-500" />
                </button>
              </div>
            </div>
          ) : (
            "—"
          )}
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${
            contact.contactType === "COMPANY"
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
          }`}>
            {contact.contactType === "COMPANY" ? "Empresa" : "Particular"}
          </span>
        </td>
        <td className="px-6 py-4 text-xs font-mono font-semibold text-foreground/80">
          {contact.cif || "—"}
        </td>
        <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
          {contact.billingCity ? `${contact.billingCity}, ${contact.billingCountry || ""}` : "—"}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => openEditModal(contact)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
              title="Editar contacto"
            >
              <Icons.Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(contact.id)}
              className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-all duration-150"
              title="Eliminar contacto"
            >
              <Icons.Trash className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  // Grouping partitions
  const groups: Record<string, Contact[]> = {};
  if (groupByField !== "NONE") {
    filteredContacts.forEach((c) => {
      const val = c[groupByField] || "Sin Clasificar";
      const key = val === "COMPANY" ? "Empresas" : val === "INDIVIDUAL" ? "Particulares" : val;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
  }

  return (
    <div className="space-y-6 relative">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-linear-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-xl border border-emerald-400 backdrop-blur-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-300">
          <Icons.CheckCircle className="h-5 w-5 text-white animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Actions Area inspired by Odoo */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
            <EditableLabel apiKey="contacts.page.title" defaultValue="Contactos & Clientes" />
          </div>
          <div className="text-xs text-muted-foreground block mt-1">
            <EditableLabel apiKey="contacts.page.desc" defaultValue="Directorio Odoo-like de gestión CRM para tu base de clientes corporativos y particulares." />
          </div>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveContacts(initialDemoContacts)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
            title="Recargar datos de prueba iniciales"
          >
            <Icons.RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Recargar Demo</span>
          </button>
        </div>
      </div>

      {/* Odoo Filters Board */}
      <div className="grid gap-3 md:grid-cols-4 bg-muted/20 border border-border/40 p-4 rounded-xl">
        {/* Search */}
        <SmartSearchInput value={searchQuery} onChange={setSearchQuery} suggestions={contacts.flatMap((contact) => [contact.name, contact.email, contact.cif ?? "", contact.billingCity ?? ""])} placeholder="Buscar por Nombre, Email, CIF, Ciudad..." className="md:col-span-2" />

        {/* Filters Selectors */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType(filterType === "ALL" ? "COMPANY" : filterType === "COMPANY" ? "INDIVIDUAL" : "ALL")}
            className={`flex-1 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold px-2 transition-all ${
              filterType !== "ALL"
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500"
                : "border-border/50 bg-background text-foreground hover:bg-muted"
            }`}
          >
            <Icons.Filter className="h-3.5 w-3.5" />
            <span>
              {filterType === "ALL" ? "Tipo: Todos" : filterType === "COMPANY" ? "Solo Empresas" : "Solo Particulares"}
            </span>
          </button>
        </div>

        {/* CIF and Grouping Switchers */}
        <div className="flex gap-2">
          {/* Has CIF toggle */}
          <button
            onClick={() => setFilterWithCif(!filterWithCif)}
            className={`flex-1 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold px-2 transition-all ${
              filterWithCif
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500"
                : "border-border/50 bg-background text-foreground hover:bg-muted"
            }`}
          >
            <Icons.FileText className="h-3.5 w-3.5" />
            <span>Con Identificación (CIF)</span>
          </button>

          {/* Group By selector */}
          <button
            onClick={() => setGroupByField(groupByField === "NONE" ? "contactType" : groupByField === "contactType" ? "billingCity" : "NONE")}
            className={`inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold px-2.5 transition-all ${
              groupByField !== "NONE"
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500"
                : "border-border/50 bg-background text-foreground hover:bg-muted"
            }`}
            title="Agrupar listado"
          >
            <Icons.Layers className="h-3.5 w-3.5" />
            <span>
              {groupByField === "NONE" ? "Agrupar" : groupByField === "contactType" ? "G: Tipo" : "G: Ciudad"}
            </span>
          </button>
        </div>
      </div>

      {/* Main CRM Table viewport */}
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 select-none">
                {/* Column: Name (Sortable) */}
                <th
                  onClick={() => handleSort("name")}
                  className="cursor-pointer px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <EditableLabel apiKey="contacts.col.name" defaultValue="Nombre" />
                    {sortField === "name" && (
                      sortOrder === "asc" ? <Icons.ArrowUp className="h-3.5 w-3.5 text-red-500" /> : <Icons.ArrowDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                </th>
                {/* Column: Email (Sortable) */}
                <th
                  onClick={() => handleSort("email")}
                  className="cursor-pointer px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <EditableLabel apiKey="contacts.col.email" defaultValue="Email" />
                    {sortField === "email" && (
                      sortOrder === "asc" ? <Icons.ArrowUp className="h-3.5 w-3.5 text-red-500" /> : <Icons.ArrowDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                </th>
                {/* Column: Phone */}
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <EditableLabel apiKey="contacts.col.phone" defaultValue="Teléfono" />
                </th>
                {/* Column: Type (Sortable) */}
                <th
                  onClick={() => handleSort("contactType")}
                  className="cursor-pointer px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <EditableLabel apiKey="contacts.col.type" defaultValue="Tipo" />
                    {sortField === "contactType" && (
                      sortOrder === "asc" ? <Icons.ArrowUp className="h-3.5 w-3.5 text-red-500" /> : <Icons.ArrowDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                </th>
                {/* Column: CIF (Sortable) */}
                <th
                  onClick={() => handleSort("cif")}
                  className="cursor-pointer px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <EditableLabel apiKey="contacts.col.cif" defaultValue="CIF / NIF" />
                    {sortField === "cif" && (
                      sortOrder === "asc" ? <Icons.ArrowUp className="h-3.5 w-3.5 text-red-500" /> : <Icons.ArrowDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                </th>
                {/* Column: Location */}
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <EditableLabel apiKey="contacts.col.city" defaultValue="Ciudad" />
                </th>
                {/* Column 8: User Requirement: A "+" button located in the LAST column horizontally and FIRST row vertically */}
                <th className="px-6 py-3.5 text-right w-24">
                  <button
                    onClick={openCreateModal}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-metallic-red shadow-md shadow-red-500/20 transition-all hover:scale-105 duration-200 cursor-pointer"
                    title="Añadir nuevo contacto (+)"
                  >
                    <Icons.Plus className="h-4.5 w-4.5" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    <Icons.Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <span>No se encontraron contactos que coincidan con la búsqueda.</span>
                  </td>
                </tr>
              ) : groupByField === "NONE" ? (
                renderTableRows(filteredContacts)
              ) : (
                Object.keys(groups).map((groupName) => (
                  <React.Fragment key={groupName}>
                    {/* Header of Group */}
                    <tr className="bg-muted/15 border-b border-border/30">
                      <td colSpan={7} className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest bg-red-500/5">
                        <div className="flex items-center gap-2">
                          <Icons.FolderOpen className="h-3.5 w-3.5" />
                          <span>{groupName} ({groups[groupName].length})</span>
                        </div>
                      </td>
                    </tr>
                    {renderTableRows(groups[groupName])}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Creation / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl rounded-2xl border border-border/50 bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingContact ? "Editar Ficha de Contacto" : "Nueva Ficha de Contacto (CRM)"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Core Type & Name */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Tipo</label>
                  <select
                    value={formData.contactType}
                    onChange={(e) => setFormData({ ...formData, contactType: e.target.value as "INDIVIDUAL" | "COMPANY" })}
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                  >
                    <option value="INDIVIDUAL">Particular (Persona)</option>
                    <option value="COMPANY">Empresa (Sociedad)</option>
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Gastroshows SL o Juan Pérez"
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                  />
                </div>
              </div>

              {/* Greeting & Email & Phone & Tax ID (CIF) */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Saludo (E-mail)</label>
                  <input
                    type="text"
                    value={formData.customGreeting}
                    onChange={(e) => setFormData({ ...formData, customGreeting: e.target.value })}
                    placeholder="Ej. Hey o Querida Silvia"
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+34 600..."
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">CIF / NIF</label>
                  <input
                    type="text"
                    value={formData.cif}
                    onChange={(e) => setFormData({ ...formData, cif: e.target.value })}
                    placeholder="B12345678"
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Nacimiento</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                  />
                </div>
              </div>

              {/* Related Company (Only for Individuals) */}
              {formData.contactType === "INDIVIDUAL" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Empresa Asociada</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Ej. Gastroshows Barcelona SL"
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                  />
                </div>
              )}

              {/* Billing Address */}
              <div className="space-y-2 border-t border-border/30 pt-3">
                <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest block mb-2">
                  Dirección de Facturación
                </span>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Calle y Número</label>
                    <input
                      type="text"
                      value={formData.billingStreet}
                      onChange={(e) => setFormData({ ...formData, billingStreet: e.target.value })}
                      placeholder="Calle Principal 10"
                      className="w-full rounded-lg border border-border/50 bg-background py-1.5 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Código Postal</label>
                    <input
                      type="text"
                      value={formData.billingZip}
                      onChange={(e) => setFormData({ ...formData, billingZip: e.target.value })}
                      placeholder="08001"
                      className="w-full rounded-lg border border-border/50 bg-background py-1.5 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Ciudad</label>
                    <input
                      type="text"
                      value={formData.billingCity}
                      onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                      placeholder="Barcelona"
                      className="w-full rounded-lg border border-border/50 bg-background py-1.5 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Notas de Interés / Observaciones</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalles sobre este contacto..."
                  rows={2}
                  className="w-full rounded-lg border border-border/50 bg-background py-1.5 px-3 text-xs text-foreground outline-hidden focus:border-red-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-500 px-5 text-xs font-bold text-white shadow-md shadow-red-500/25 hover:bg-red-600 transition-all"
                >
                  <Icons.Save className="h-4 w-4" />
                  <span>Guardar Contacto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive E-mail Dispatcher Modal (Odoo Style) */}
      {isEmailModalOpen && emailContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border/50 bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
                  <Icons.Send className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Redactar Correo CRM</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Envío directo con resolución automática de saludo y plantilla.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            {/* Email Dispatcher Body */}
            <form onSubmit={handleSendEmail} className="space-y-4">
              {/* From / To headers */}
              <div className="space-y-2.5 bg-muted/20 border border-border/40 p-3.5 rounded-xl text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-12 font-bold uppercase tracking-wider text-muted-foreground/60 text-[10px]">De:</span>
                  <span className="text-foreground">admin@palmera.io</span>
                </div>
                <div className="flex items-center gap-2 border-t border-border/30 pt-2">
                  <span className="w-12 font-bold uppercase tracking-wider text-muted-foreground/60 text-[10px]">Para:</span>
                  <span className="text-foreground font-semibold">{emailContact.name} ({emailContact.email})</span>
                </div>
              </div>

              {/* Template Fast Selectors */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                  Selección de Plantilla Operativa
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyEmailTemplate("casual")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      activeTemplate === "casual"
                        ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500"
                        : "border-border/50 bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icons.MessageSquare className="h-3.5 w-3.5" />
                    <span>Casual (Hey, mañana tienes...)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEmailTemplate("operations")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      activeTemplate === "operations"
                        ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500"
                        : "border-border/50 bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icons.Activity className="h-3.5 w-3.5" />
                    <span>Operaciones (Querida Silvia, necesito...)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEmailTemplate("custom")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      activeTemplate === "custom"
                        ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500"
                        : "border-border/50 bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icons.FileEdit className="h-3.5 w-3.5" />
                    <span>En Blanco (Personalizado)</span>
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Asunto</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Asunto del correo"
                  className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Mensaje</label>
                  <span className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded font-mono">
                    GREETING: "{emailContact.customGreeting || "Hola " + emailContact.name.split(" ")[0]}"
                  </span>
                </div>
                <textarea
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Redacta el contenido..."
                  rows={6}
                  className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500 resize-none font-mono text-xs"
                />
              </div>

              {/* Actions Footer with Loader */}
              <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={isSendingEmail}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-500 px-5 text-xs font-bold text-white shadow-md shadow-red-500/25 hover:bg-red-600 transition-all disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  {isSendingEmail ? (
                    <>
                      <Icons.Loader2 className="h-4 w-4 text-white animate-spin" />
                      <span>Enviando correo...</span>
                    </>
                  ) : (
                    <>
                      <Icons.MailCheck className="h-4 w-4" />
                      <span>Enviar E-mail</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Phone / WhatsApp Dispatcher Modal */}
      {isPhoneModalOpen && phoneContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl border border-border/50 bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                  phoneActionType === "CALL"
                    ? "bg-red-500/10 border-red-500/20 text-red-500"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                }`}>
                  {phoneActionType === "CALL" ? (
                    <Icons.PhoneCall className="h-4.5 w-4.5" />
                  ) : (
                    <Icons.MessageCircle className="h-4.5 w-4.5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {phoneActionType === "CALL" ? "Llamada Telefónica (Voz)" : "Mensaje de WhatsApp"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Contacto: {phoneContact.name} ({phoneContact.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCallingActive(false);
                  setIsPhoneModalOpen(false);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            {/* Selector Tabs to toggle call/whatsapp inside modal */}
            <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1.5 rounded-xl mb-4 border border-border/20">
              <button
                type="button"
                onClick={() => {
                  setPhoneActionType("CALL");
                  setIsCallingActive(true);
                }}
                className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
                  phoneActionType === "CALL"
                    ? "bg-card text-red-500 shadow-xs border border-border/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icons.Phone className="h-3.5 w-3.5" />
                <span>📞 Llamar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhoneActionType("WHATSAPP");
                  setIsCallingActive(false);
                  applyWhatsappTemplate("casual");
                }}
                className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
                  phoneActionType === "WHATSAPP"
                    ? "bg-card text-emerald-500 shadow-xs border border-border/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icons.MessageSquare className="h-3.5 w-3.5" />
                <span>💬 WhatsApp</span>
              </button>
            </div>

            {/* Tab: CALL (Pulsing simulated dialer screen) */}
            {phoneActionType === "CALL" && (
              <div className="space-y-6 py-4 flex flex-col items-center justify-center text-center">
                <div className="relative flex items-center justify-center">
                  {/* Outer Pulsing Glow */}
                  <div className="absolute h-24 w-24 rounded-full bg-red-500/10 border border-red-500/20 animate-ping duration-1000" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-b from-red-500/20 to-red-500/10 border border-red-500/30 text-red-500">
                    <Icons.PhoneCall className="h-10 w-10 animate-bounce" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-foreground">{phoneContact.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono">{phoneContact.phone}</p>
                  {phoneContact.companyName && (
                    <span className="inline-block text-[10px] bg-muted px-2 py-0.5 rounded-md text-muted-foreground font-semibold">
                      {phoneContact.companyName}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold tracking-widest text-red-600 dark:text-red-500 uppercase block animate-pulse">
                    {isCallingActive ? "Marcando..." : "Llamando..."}
                  </span>
                  {isCallingActive && (
                    <span className="text-sm font-mono text-foreground/80 block bg-muted/50 px-3 py-1 rounded-full font-bold">
                      {formatCallTime(callSeconds)}
                    </span>
                  )}
                </div>

                {/* Call Controls */}
                <div className="flex items-center gap-3 pt-4">
                  {/* Native VoIP Trigger button */}
                  <button
                    onClick={triggerNativeCall}
                    className="inline-flex h-10 px-4 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted cursor-pointer transition-all duration-150 active:scale-95"
                    title="Lanzar llamada nativa con tu aplicación telefónica"
                  >
                    <Icons.Smartphone className="h-4 w-4 text-red-500" />
                    <span>Llamada Externa</span>
                  </button>

                  {/* Red Hangup button */}
                  <button
                    onClick={handleHangUp}
                    className="inline-flex h-11 w-24 items-center justify-center gap-1.5 rounded-xl bg-destructive hover:bg-destructive-hover text-white text-xs font-extrabold shadow-md shadow-destructive/20 cursor-pointer transition-all duration-150 active:scale-95"
                    title="Colgar llamada"
                  >
                    <Icons.PhoneOff className="h-4 w-4" />
                    <span>Colgar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab: WHATSAPP (Message and templates panel) */}
            {phoneActionType === "WHATSAPP" && (
              <form onSubmit={handleSendWhatsapp} className="space-y-4">
                {/* Custom WhatsApp Template buttons */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                    Plantillas Rápidas para WhatsApp
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyWhatsappTemplate("casual")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        activeWhatsappTemplate === "casual"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-500"
                          : "border-border/50 bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icons.MessageSquare className="h-3.5 w-3.5" />
                      <span>Recordatorio (Hey...)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyWhatsappTemplate("operations")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        activeWhatsappTemplate === "operations"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-500"
                          : "border-border/50 bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icons.Activity className="h-3.5 w-3.5" />
                      <span>Urgente (Silvia...)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyWhatsappTemplate("custom")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        activeWhatsappTemplate === "custom"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-500"
                          : "border-border/50 bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icons.FileEdit className="h-3.5 w-3.5" />
                      <span>Mensaje en Blanco</span>
                    </button>
                  </div>
                </div>

                {/* WhatsApp Textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Mensaje de WhatsApp</label>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                      GREETING: "{phoneContact.customGreeting || "Hola " + phoneContact.name.split(" ")[0]}"
                    </span>
                  </div>
                  <textarea
                    required
                    value={whatsappText}
                    onChange={(e) => setWhatsappText(e.target.value)}
                    placeholder="Escribe el mensaje de WhatsApp..."
                    rows={5}
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-emerald-500 resize-none font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    * Al pulsar Enviar, se abrirá la interfaz oficial de WhatsApp Web con el texto pre-cargado.
                  </p>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsPhoneModalOpen(false)}
                    disabled={isSendingEmail}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-xs font-bold text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-600 transition-all disabled:opacity-80 disabled:cursor-not-allowed"
                  >
                    {isSendingEmail ? (
                      <>
                        <Icons.Loader2 className="h-4 w-4 text-white animate-spin" />
                        <span>Abriendo WhatsApp...</span>
                      </>
                    ) : (
                      <>
                        <Icons.Send className="h-4 w-4" />
                        <span>Enviar WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
