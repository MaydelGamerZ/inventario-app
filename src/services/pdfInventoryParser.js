import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function normalizeSpaces(text) {
  return text.replace(/\s+/g, " ").trim();
}

function parseNumber(value) {
  if (!value) return 0;
  return Number(String(value).replace(/,/g, "").trim());
}

function isCategoryLine(line) {
  const clean = normalizeSpaces(line);

  if (!clean) return false;
  if (/^TOTAL\.-/i.test(clean)) return false;
  if (/^TOTAL GENERAL\.-/i.test(clean)) return false;
  if (/^PRODUCTO\b/i.test(clean)) return false;
  if (/^DISTRIBUCIONES A DETALLE/i.test(clean)) return false;
  if (/^INFORME DE INVENTARIO DIARIO/i.test(clean)) return false;
  if (/^Semana:/i.test(clean)) return false;
  if (/^Hoja \d+ de \d+/i.test(clean)) return false;

  return /^\d{2}\s*-\s*.+\s*-\s*\d+\s*-\s*.+$/i.test(clean);
}

function isTotalLine(line) {
  const clean = normalizeSpaces(line);
  return /^TOTAL\.-/i.test(clean) || /^TOTAL GENERAL\.-/i.test(clean);
}

function isHeaderLine(line) {
  const clean = normalizeSpaces(line);

  return (
    /^PRODUCTO\b/i.test(clean) ||
    /^CANTIDAD\b/i.test(clean) ||
    /^NO DISPONIB/i.test(clean) ||
    /^CONTEO FISICO/i.test(clean) ||
    /^TOTAL DIFERENCIA/i.test(clean) ||
    /^OBSERVACIÓN/i.test(clean) ||
    /^DISTRIBUCIONES A DETALLE/i.test(clean) ||
    /^INFORME DE INVENTARIO DIARIO/i.test(clean) ||
    /^Semana:/i.test(clean) ||
    /^Hoja \d+ de \d+/i.test(clean)
  );
}

function parseProductLine(line) {
  const clean = normalizeSpaces(line);

  if (!clean) return null;
  if (isHeaderLine(clean)) return null;
  if (isCategoryLine(clean)) return null;
  if (isTotalLine(clean)) return null;

  const noUnderscores = clean.replace(/_+/g, " ").trim();

  const match = noUnderscores.match(/^(.*)\s+(-?\d[\d,]*)\s+(-?\d[\d,]*)$/);

  if (!match) return null;

  const nombre = normalizeSpaces(match[1]);
  const stockEsperado = parseNumber(match[2]);
  const noDisponible = parseNumber(match[3]);

  if (!nombre) return null;

  return {
    nombre,
    stockEsperado,
    noDisponible,
  };
}

function extractMetaFromText(fullText) {
  const normalized = fullText.replace(/\s+/g, " ");

  const semanaMatch = normalized.match(/Semana:\s*(\d+)/i);
  const fechaMatch = normalized.match(/Fecha:\s*(.+?)\s+Cedis:/i);
  const cedisMatch = normalized.match(/Cedis:\s*([A-ZÁÉÍÓÚÑ ]+)/i);

  return {
    semana: semanaMatch ? semanaMatch[1].trim() : "",
    fechaTexto: fechaMatch ? fechaMatch[1].trim() : "",
    cedis: cedisMatch ? cedisMatch[1].trim() : "",
  };
}

async function extractLinesFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLines = [];
  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const items = textContent.items
      .map((item) => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
      }))
      .filter((item) => item.text && item.text.trim() !== "");

    items.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 2) return b.y - a.y;
      return a.x - b.x;
    });

    const rows = [];

    for (const item of items) {
      const existingRow = rows.find((row) => Math.abs(row.y - item.y) <= 2);

      if (existingRow) {
        existingRow.items.push(item);
      } else {
        rows.push({
          y: item.y,
          items: [item],
        });
      }
    }

    rows.sort((a, b) => b.y - a.y);

    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      const line = normalizeSpaces(row.items.map((i) => i.text).join(" "));
      if (line) {
        allLines.push(line);
        fullText += `${line}\n`;
      }
    }
  }

  return {
    lines: allLines,
    fullText,
  };
}

export async function parseInventoryPdf(file) {
  const { lines, fullText } = await extractLinesFromPdf(file);
  const meta = extractMetaFromText(fullText);

  const categorias = [];
  let categoriaActual = null;

  for (const rawLine of lines) {
    const line = normalizeSpaces(rawLine);

    if (!line) continue;
    if (isHeaderLine(line)) continue;
    if (isTotalLine(line)) continue;

    if (isCategoryLine(line)) {
      categoriaActual = {
        nombre: line,
        productos: [],
      };
      categorias.push(categoriaActual);
      continue;
    }

    const producto = parseProductLine(line);

    if (producto && categoriaActual) {
      categoriaActual.productos.push(producto);
    }
  }

  return {
    semana: meta.semana,
    fechaTexto: meta.fechaTexto,
    cedis: meta.cedis,
    categorias,
    totalCategorias: categorias.length,
    totalProductos: categorias.reduce(
      (acc, cat) => acc + cat.productos.length,
      0
    ),
  };
}