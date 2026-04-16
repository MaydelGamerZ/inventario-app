import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const MONTHS_ES = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

function normalizeSpaces(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function cleanLine(value = '') {
  return normalizeSpaces(
    String(value)
      .replace(/[_]+/g, ' ')
      .replace(/[|]+/g, ' ')
      .replace(/[•]+/g, ' ')
      .replace(/—/g, ' ')
      .replace(/–/g, ' ')
      .replace(/\u00A0/g, ' ')
  );
}

function normalizeForCompare(value = '') {
  return cleanLine(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseNumber(value) {
  if (value === undefined || value === null) return 0;

  const normalized = String(value).replace(/\s/g, '').replace(/,/g, '').trim();

  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseSpanishDateToKey(dateLabel) {
  const normalized = normalizeSpaces(dateLabel).toLowerCase();

  const match = normalized.match(
    /^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/i
  );

  if (!match) return '';

  const day = String(Number(match[1])).padStart(2, '0');
  const monthName = match[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const year = match[3];
  const month = MONTHS_ES[monthName];

  if (!month) return '';

  return `${year}-${month}-${day}`;
}

function isDecorativeLine(line) {
  const normalized = normalizeForCompare(line);

  if (!normalized) return true;

  return (
    normalized.startsWith('producto') ||
    normalized.startsWith('cantidad') ||
    normalized.startsWith('no disponible') ||
    normalized.startsWith('no disp') ||
    normalized.startsWith('conteo fisico') ||
    normalized.startsWith('total diferencia') ||
    normalized.startsWith('observacion') ||
    normalized.startsWith('distribuciones a detalle') ||
    normalized.startsWith('informe de inventario diario') ||
    /^hoja \d+ de \d+$/.test(normalized) ||
    /^-+$/.test(normalized)
  );
}

function isCategoryHeader(line) {
  const cleaned = cleanLine(line);

  return /^\d{2}\s*-\s*.+?\s*-\s*\d+\s*-\s*.+$/i.test(cleaned);
}

function isTotalLine(line) {
  const normalized = normalizeForCompare(line);

  return (
    normalized.startsWith('total.-') ||
    normalized.startsWith('total general.-') ||
    normalized.startsWith('total general')
  );
}

function parseCategoryHeader(rawHeader) {
  const cleaned = cleanLine(rawHeader);

  const match = cleaned.match(/^(\d{2})\s*-\s*(.+?)\s*-\s*(\d+)\s*-\s*(.+)$/i);

  if (!match) {
    return {
      supplierCode: '',
      supplierName: '',
      categoryCode: '',
      categoryName: cleaned,
      categoryRaw: cleaned,
    };
  }

  return {
    supplierCode: normalizeSpaces(match[1]),
    supplierName: normalizeSpaces(match[2]),
    categoryCode: normalizeSpaces(match[3]),
    categoryName: normalizeSpaces(match[4]),
    categoryRaw: cleaned,
  };
}

function parseProductLine(line) {
  const cleaned = cleanLine(line);

  if (!cleaned) return null;
  if (isDecorativeLine(cleaned)) return null;
  if (isCategoryHeader(cleaned)) return null;
  if (isTotalLine(cleaned)) return null;

  // Busca dos números al final: cantidad y no disponible
  const match = cleaned.match(/^(.*?)\s+(-?\d[\d,]*)\s+(-?\d[\d,]*)$/);

  if (!match) return null;

  const productName = normalizeSpaces(match[1]);
  const quantity = parseNumber(match[2]);
  const noDisponible = parseNumber(match[3]);

  if (!productName) return null;

  return {
    productName,
    quantity,
    noDisponible,
  };
}

function extractMetaFromText(fullText) {
  const normalized = normalizeSpaces(fullText);

  const weekMatch = normalized.match(/Semana:\s*(\d+)/i);

  const dateMatch = normalized.match(
    /Fecha:\s*([0-9]{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4})/i
  );

  const cedisMatch =
    normalized.match(/Cedis:\s*([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s-]*)/i) ||
    normalized.match(/CEDIS:\s*([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s-]*)/i);

  const totalGeneralMatch = normalized.match(
    /TOTAL GENERAL\.-\s*([-\d,]+)\s+([-\d,]+)/i
  );

  const dateLabel = dateMatch ? normalizeSpaces(dateMatch[1]) : '';
  const dateKey = parseSpanishDateToKey(dateLabel);

  return {
    week: weekMatch ? normalizeSpaces(weekMatch[1]) : '',
    dateLabel,
    dateKey,
    cedis: cedisMatch ? normalizeSpaces(cedisMatch[1]) : '',
    totalGeneral: totalGeneralMatch ? parseNumber(totalGeneralMatch[1]) : 0,
    totalGeneralNoDisponible: totalGeneralMatch
      ? parseNumber(totalGeneralMatch[2])
      : 0,
  };
}

async function extractLinesFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const rowsMap = new Map();

    for (const item of textContent.items) {
      if (!item?.str || !String(item.str).trim()) continue;

      const x = item.transform[4];
      const y = Math.round(item.transform[5]);

      if (!rowsMap.has(y)) {
        rowsMap.set(y, []);
      }

      rowsMap.get(y).push({
        x,
        text: item.str,
      });
    }

    const rows = Array.from(rowsMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, rowItems]) =>
        rowItems
          .sort((a, b) => a.x - b.x)
          .map((entry) => entry.text)
          .join(' ')
      )
      .map(cleanLine)
      .filter(Boolean);

    pages.push(rows);
  }

  return pages;
}

function buildCategoryKey(category) {
  return [
    category?.supplierCode || '',
    category?.categoryCode || '',
    category?.categoryName || '',
  ].join('::');
}

function computeItemStatus(quantity, noDisponible) {
  if (quantity <= 0) return 'FALTANTE';
  if (noDisponible > 0) return 'ALERTA';
  return 'OK';
}

export async function parseInventoryPdf(file) {
  if (!file) {
    throw new Error('No se recibió ningún archivo PDF.');
  }

  if (file.type && file.type !== 'application/pdf') {
    throw new Error('El archivo seleccionado no es un PDF válido.');
  }

  const pages = await extractLinesFromPdf(file);
  const allLines = pages.flat();
  const fullText = allLines.join('\n');

  const meta = extractMetaFromText(fullText);

  if (!meta.dateKey) {
    throw new Error('No se pudo detectar la fecha del PDF.');
  }

  if (!meta.cedis) {
    throw new Error('No se pudo detectar el CEDIS del PDF.');
  }

  let currentCategory = null;
  const categoriesMap = new Map();
  const items = [];

  for (const rawLine of allLines) {
    const line = cleanLine(rawLine);

    if (!line || isDecorativeLine(line)) {
      continue;
    }

    if (isCategoryHeader(line)) {
      currentCategory = parseCategoryHeader(line);

      const categoryKey = buildCategoryKey(currentCategory);

      if (!categoriesMap.has(categoryKey)) {
        categoriesMap.set(categoryKey, {
          supplierCode: currentCategory.supplierCode,
          supplierName: currentCategory.supplierName,
          categoryCode: currentCategory.categoryCode,
          categoryName: currentCategory.categoryName,
          categoryRaw: currentCategory.categoryRaw,
          itemCount: 0,
          quantityTotal: 0,
          noDisponibleTotal: 0,
        });
      }

      continue;
    }

    if (isTotalLine(line)) {
      continue;
    }

    const parsedProduct = parseProductLine(line);

    if (!parsedProduct || !currentCategory) {
      continue;
    }

    const categoryKey = buildCategoryKey(currentCategory);
    const categoryRef = categoriesMap.get(categoryKey);

    const status = computeItemStatus(
      parsedProduct.quantity,
      parsedProduct.noDisponible
    );

    const item = {
      productName: parsedProduct.productName,
      categoryName: currentCategory.categoryName,
      categoryCode: currentCategory.categoryCode,
      categoryRaw: currentCategory.categoryRaw,
      supplierName: currentCategory.supplierName,
      supplierCode: currentCategory.supplierCode,
      expectedQuantity: parsedProduct.quantity,
      unavailableQuantity: parsedProduct.noDisponible,
      countedQuantity: '',
      total: '',
      difference: '',
      observation: '',
      countEntries: [],
      status,
    };

    items.push(item);

    if (categoryRef) {
      categoryRef.itemCount += 1;
      categoryRef.quantityTotal += parsedProduct.quantity;
      categoryRef.noDisponibleTotal += parsedProduct.noDisponible;
    }
  }

  if (items.length === 0) {
    throw new Error('No se detectaron productos válidos dentro del PDF.');
  }

  const categories = Array.from(categoriesMap.values()).sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName, 'es', {
      sensitivity: 'base',
    })
  );

  return {
    sourceFileName: file.name,
    week: meta.week,
    dateLabel: meta.dateLabel,
    dateKey: meta.dateKey,
    cedis: meta.cedis,
    totalGeneral: meta.totalGeneral,
    totalGeneralNoDisponible: meta.totalGeneralNoDisponible,
    categories,
    items,
  };
}
