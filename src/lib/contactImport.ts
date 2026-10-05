import * as XLSX from "xlsx";

export interface ParsedContactRow {
  name: string;
  email: string;
  category: "NONE" | "ALUMNO" | "TUTOR" | "PROFESOR";
  phone?: string;
  contactType?: "INDIVIDUAL" | "COMPANY";
  instrument?: string;
  tutorForStudentEmail?: string;
  companyName?: string;
  cif?: string;
  birthDate?: string;
  billingStreet?: string;
  billingZip?: string;
  billingCity?: string;
  billingCountry?: string;
  notes?: string;
}

export interface ImportResult {
  validRows: ParsedContactRow[];
  errors: string[];
}

export async function parseContactsExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json<any>(worksheet);

        const validRows: ParsedContactRow[] = [];
        const errors: string[] = [];

        rawData.forEach((row, index) => {
          const rowNum = index + 2; // +1 for 0-index, +1 for header

          const name = String(row.name || "").trim();
          const email = String(row.email || "").trim().toLowerCase();
          const categoryRaw = String(row.category || "NONE").trim().toUpperCase();
          const category = ["ALUMNO", "TUTOR", "PROFESOR"].includes(categoryRaw) ? categoryRaw : "NONE";
          
          const instrument = String(row.instrument || "").trim().toUpperCase();

          if (!name) {
            errors.push(`Fila ${rowNum}: El nombre es obligatorio.`);
            return;
          }
          if (!email) {
            errors.push(`Fila ${rowNum}: El email es obligatorio.`);
            return;
          }

          if (category === "ALUMNO" && !instrument) {
            errors.push(`Fila ${rowNum}: El instrumento es obligatorio para los alumnos.`);
            return;
          }

          const validInstruments = ["BAJO", "GUITARRA_ACUSTICA", "GUITARRA_ELECTRICA", "BATERIA", "PIANO", "VOZ"];
          if (category === "ALUMNO" && !validInstruments.includes(instrument)) {
            errors.push(`Fila ${rowNum}: Instrumento '${instrument}' no válido.`);
            return;
          }

          let formattedBirthDate = undefined;
          if (row.birthDate) {
             const bdStr = String(row.birthDate).trim();
             // Expecting ddMMyyyy
             if (bdStr.length === 8) {
                 const day = bdStr.substring(0, 2);
                 const month = bdStr.substring(2, 4);
                 const year = bdStr.substring(4, 8);
                 formattedBirthDate = `${year}-${month}-${day}`; // standard YYYY-MM-DD
             }
          }

          validRows.push({
            name,
            email,
            category: category as any,
            phone: row.phone ? String(row.phone).trim() : undefined,
            contactType: (row.contactType === "COMPANY" ? "COMPANY" : "INDIVIDUAL"),
            instrument: category === "ALUMNO" ? instrument : undefined,
            tutorForStudentEmail: category === "TUTOR" && row.tutorForStudentEmail ? String(row.tutorForStudentEmail).trim().toLowerCase() : undefined,
            companyName: row.companyName ? String(row.companyName).trim() : undefined,
            cif: row.cif ? String(row.cif).trim() : undefined,
            birthDate: formattedBirthDate,
            billingStreet: row.billingStreet ? String(row.billingStreet).trim() : undefined,
            billingZip: row.billingZip ? String(row.billingZip).trim() : undefined,
            billingCity: row.billingCity ? String(row.billingCity).trim() : undefined,
            billingCountry: row.billingCountry ? String(row.billingCountry).trim() : undefined,
            notes: row.notes ? String(row.notes).trim() : undefined,
          });
        });

        resolve({ validRows, errors });
      } catch (err: any) {
        reject(new Error("Error al leer el archivo Excel: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Error de lectura del archivo."));
    reader.readAsArrayBuffer(file);
  });
}

export function generateContactsExcelTemplate() {
  const wsData = [
    [
      "name",
      "email",
      "category",
      "phone",
      "contactType",
      "instrument",
      "tutorForStudentEmail",
      "companyName",
      "cif",
      "birthDate",
      "billingStreet",
      "billingZip",
      "billingCity",
      "billingCountry",
      "notes",
    ],
    [
      "Juan Pérez",
      "juan@ejemplo.com",
      "ALUMNO",
      "+34600123456",
      "INDIVIDUAL",
      "GUITARRA_ACUSTICA",
      "",
      "",
      "12345678Z",
      "15031990",
      "Calle Falsa 123",
      "28001",
      "Madrid",
      "España",
      "Alumno de prueba",
    ],
    [
      "María Gómez",
      "maria@ejemplo.com",
      "TUTOR",
      "+34600654321",
      "INDIVIDUAL",
      "",
      "juan@ejemplo.com",
      "",
      "87654321X",
      "",
      "",
      "",
      "",
      "España",
      "Madre de Juan",
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 20 }, // name
    { wch: 25 }, // email
    { wch: 15 }, // category
    { wch: 15 }, // phone
    { wch: 15 }, // contactType
    { wch: 20 }, // instrument
    { wch: 25 }, // tutorForStudentEmail
    { wch: 20 }, // companyName
    { wch: 15 }, // cif
    { wch: 15 }, // birthDate
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contactos");
  XLSX.writeFile(wb, "plantilla_contactos.xlsx");
}
