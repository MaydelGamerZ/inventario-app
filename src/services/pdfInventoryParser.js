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

function normalizeSpaces(text = '') {
  return text.replace(/\s+/g, ' ').trim();
}

function cleanLine(text = '') {
  return normalizeSpaces(
    text
      .replace(/[_]+/g, ' ')
      .replace(/[|]+/g, ' ')
      .replace(/—/g, ' ')
      .replace(/–/g, ' ')
  );
}

function isDecorativeLine(line) {
  if (!line) return true;

  return (
    /^PRODUCTO\b/i.test(line) ||
    /^CANTIDAD\b/i.test(line) ||
    /^NO\s*DISPONIB/i.test(line) ||
    /^CONTEO FISICO/i.test(line) ||
    /^TOTAL DIFERENCIA/i.test(line) ||
    /^OBSERVACIÓN/i.test(line) ||
    /^DISTRIBUCIONES A DETALLE/i.test(line) ||
    /^INFORME DE INVENTARIO DIARIO/i.test(line) ||
    /^Hoja\s+\d+\s+de\s+\d+/i.test(line) ||
    /^-+$/.test(line)
  );
}

function isCategoryHeader(line) {
  return /^\d{2}\s*-\s*.+\s*-\s*\d+\s*-\s*.+$/i.test(line);
}

function isTotalLine(line) {
  return /^TOTAL(?:\s+GENERAL)?\.-/i.test(line);
}

function parseSpanishDateToKey(dateLabel) {
  if (!dateLabel) return '';

  const match = normalizeSpaces(dateLabel)
    .toLowerCase()
    .match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/i);

  if (!match) return '';

  const day = String(Number(match[1])).padStart(2, '0');
  const monthName = match[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const year = match[3];
  const month = MONTHS_ES[monthName];

  if (!month) return '';

  return `${year}-${month}-${day}`;
}

function parseNumber(value) {
  if (value === undefined || value === null) return 0;

  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return 0;

  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function extractMetaFromText(fullText) {
  const normalized = normalizeSpaces(fullText);

  const weekMatch = normalized.match(/Semana:\s*(\d+)/i);
  const dateMatch = normalized.match(
    /Fecha:\s*([0-9]{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4})/i
  );
  const cedisMatch = normalized.match(/Cedis:\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]*)/i);
  const totalGeneralMatch = normalized.match(
    /TOTAL GENERAL\.-\s*([-\d,]+)\s+([-\d,]+)/i
  );

  const dateLabel = dateMatch ? normalizeSpaces(dateMatch[1]) : '';
  const dateKey = parseSpanishDateToKey(dateLabel);

  return {
    week: weekMatch ? weekMatch[1] : '',
    dateLabel,
    dateKey,
    cedis: cedisMatch ? normalizeSpaces(cedisMatch[1]) : '',
    totalGeneral: totalGeneralMatch ? parseNumber(totalGeneralMatch[1]) : 0,
    totalGeneralNoDisponible: totalGeneralMatch
      ? parseNumber(totalGeneralMatch[2])
      : 0,
  };
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
      raw: cleaned,
    };
  }

  return {
    supplierCode: match[1],
    supplierName: normalizeSpaces(match[2]),
    categoryCode: match[3],
    categoryName: normalizeSpaces(match[4]),
    raw: cleaned,
  };
}

function parseProductLine(line) {
  const cleaned = cleanLine(line);

  if (
    !cleaned ||
    isDecorativeLine(cleaned) ||
    isCategoryHeader(cleaned) ||
    isTotalLine(cleaned)
  ) {
    return null;
  }

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
      if (!item.str || !String(item.str).trim()) continue;

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

export async function parseInventoryPdf(file) {
  if (!file) {
    throw new Error('No se recibió ningún archivo PDF.');
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
      const categoryKey = `${currentCategory.supplierCode}-${currentCategory.categoryCode}-${currentCategory.categoryName}`;

      if (!categoriesMap.has(categoryKey)) {
        categoriesMap.set(categoryKey, {
          ...currentCategory,
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

    const categoryKey = `${currentCategory.supplierCode}-${currentCategory.categoryCode}-${currentCategory.categoryName}`;
    const categoryRef = categoriesMap.get(categoryKey);

    const status =
      parsedProduct.quantity <= 0
        ? 'FALTANTE'
        : parsedProduct.noDisponible > 0
          ? 'ALERTA'
          : 'OK';

    const item = {
      productName: parsedProduct.productName,
      categoryName: currentCategory.categoryName,
      categoryCode: currentCategory.categoryCode,
      categoryRaw: currentCategory.raw,
      supplierName: currentCategory.supplierName,
      supplierCode: currentCategory.supplierCode,
      expectedQuantity: parsedProduct.quantity,
      unavailableQuantity: parsedProduct.noDisponible,
      countedQuantity: '',
      total: '',
      difference: '',
      observation: '',
      status,
    };

    items.push(item);

    if (categoryRef) {
      categoryRef.itemCount += 1;
      categoryRef.quantityTotal += parsedProduct.quantity;
      categoryRef.noDisponibleTotal += parsedProduct.noDisponible;
    }
  }

  return {
    sourceFileName: file.name,
    week: meta.week,
    dateLabel: meta.dateLabel,
    dateKey: meta.dateKey,
    cedis: meta.cedis,
    totalGeneral: meta.totalGeneral,
    totalGeneralNoDisponible: meta.totalGeneralNoDisponible,
    categories: Array.from(categoriesMap.values()),
    items,
  };
}
