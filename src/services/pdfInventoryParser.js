import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

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

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(
    String(value).replace(/\s/g, '').replace(/,/g, '').trim()
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSpaces(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cleanLine(value) {
  return normalizeSpaces(
    String(value || '')
      .replace(/[_]+/g, ' ')
      .replace(/[|]+/g, ' ')
      .replace(/[•]+/g, ' ')
      .replace(/[·]+/g, ' ')
      .replace(/—/g, ' ')
      .replace(/–/g, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/\t/g, ' ')
  );
}

function normalizeForCompare(value) {
  return removeAccents(cleanLine(value).toLowerCase());
}

function parseNumber(value) {
  return safeNumber(value);
}

function flattenPages(pages) {
  const result = [];

  for (let i = 0; i < pages.length; i += 1) {
    const page = Array.isArray(pages[i]) ? pages[i] : [];
    for (let j = 0; j < page.length; j += 1) {
      result.push(page[j]);
    }
  }

  return result;
}

function parseSpanishDateToKey(dateLabel) {
  const normalized = normalizeSpaces(dateLabel).toLowerCase();

  const match = normalized.match(
    /^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/i
  );

  if (!match) return '';

  const day = String(Number(match[1])).padStart(2, '0');
  const monthName = removeAccents(match[2].toLowerCase());
  const year = match[3];
  const month = MONTHS_ES[monthName];

  if (!month) return '';

  return `${year}-${month}-${day}`;
}

function isDecorativeLine(line) {
  const normalized = normalizeForCompare(line);

  if (!normalized) return true;

  return (
    normalized === 'producto' ||
    normalized === 'cantidad' ||
    normalized === 'no disponible' ||
    normalized === 'no disponib le' ||
    normalized === 'conteo fisico' ||
    normalized === 'total diferencia' ||
    normalized === 'observacion' ||
    normalized === 'observacion diferencia' ||
    normalized.indexOf('producto cantidad') === 0 ||
    normalized.indexOf('cantidad no disponible') === 0 ||
    normalized.indexOf('distribuciones a detalle') === 0 ||
    normalized.indexOf('informe de inventario diario') === 0 ||
    normalized.indexOf('fecha:') === 0 ||
    normalized.indexOf('semana:') === 0 ||
    normalized.indexOf('cedis:') === 0 ||
    /^hoja\s+\d+\s+de\s+\d+/i.test(normalized) ||
    /^pagina\s+\d+\s+de\s+\d+/i.test(normalized) ||
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
    normalized.indexOf('total.-') === 0 ||
    normalized.indexOf('total general.-') === 0 ||
    normalized.indexOf('total general') === 0 ||
    normalized === 'total'
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
      fullName: cleaned,
    };
  }

  const supplierCode = normalizeSpaces(match[1]);
  const supplierName = normalizeSpaces(match[2]);
  const categoryCode = normalizeSpaces(match[3]);
  const categoryName = normalizeSpaces(match[4]);
  const fullName = cleaned;

  return {
    supplierCode,
    supplierName,
    categoryCode,
    categoryName,
    categoryRaw: cleaned,
    fullName,
  };
}

function parseProductLine(line) {
  const cleaned = cleanLine(line);

  if (!cleaned) return null;
  if (isDecorativeLine(cleaned)) return null;
  if (isCategoryHeader(cleaned)) return null;
  if (isTotalLine(cleaned)) return null;

  let match = cleaned.match(/^(.*?)\s+(-?\d[\d,]*)\s+(-?\d[\d,]*)$/);

  if (!match) {
    match = cleaned.match(/^(.+?)\s+(\d[\d,]*)\s+(\d[\d,]*)$/);
  }

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

function extractValueFromFullText(fullText, label) {
  const normalizedText = normalizeSpaces(fullText);
  const regex = new RegExp(
    `${label}\\s*:\\s*([^\\n]+?)($|\\s{2,}|PRODUCTO|CANTIDAD|NO\\s+DISPONIB|CONTEO\\s+FISICO|TOTAL|DIFERENCIA|OBSERVACI[ÓO]N)`,
    'i'
  );
  const match = normalizedText.match(regex);

  if (!match) return '';
  return normalizeSpaces(match[1]);
}

function extractSingleLineValue(allLines, label) {
  const normalizedLabel = `${normalizeForCompare(label)}:`;

  for (const rawLine of allLines) {
    const line = cleanLine(rawLine);
    const normalized = normalizeForCompare(line);

    if (normalized.startsWith(normalizedLabel)) {
      const colonIndex = line.indexOf(':');
      if (colonIndex >= 0) {
        return normalizeSpaces(line.slice(colonIndex + 1));
      }
    }
  }

  return '';
}

function cleanCedisValue(value) {
  let text = normalizeSpaces(value);

  if (!text) return '';

  const stopTokens = [
    ' PRODUCTO',
    ' CANTIDAD',
    ' NO DISPONIBLE',
    ' NO DISPONIB',
    ' CONTEO FISICO',
    ' TOTAL',
    ' DIFERENCIA',
    ' OBSERVACIÓN',
    ' OBSERVACION',
    ' DISTRIBUCIONES A DETALLE',
    ' INFORME DE INVENTARIO DIARIO',
  ];

  const upper = text.toUpperCase();
  let cutIndex = -1;

  for (const token of stopTokens) {
    const idx = upper.indexOf(token);
    if (idx > 0 && (cutIndex === -1 || idx < cutIndex)) {
      cutIndex = idx;
    }
  }

  if (cutIndex > 0) {
    text = text.slice(0, cutIndex).trim();
  }

  return normalizeSpaces(text);
}

function extractWeek(fullText, allLines) {
  const normalizedText = normalizeSpaces(fullText);
  const fromFullText = normalizedText.match(/Semana:\s*(\d{1,2})/i);
  if (fromFullText) return normalizeSpaces(fromFullText[1]);

  for (const line of allLines) {
    const cleaned = cleanLine(line);
    const match = cleaned.match(/Semana:\s*(\d{1,2})/i);
    if (match) return normalizeSpaces(match[1]);
  }

  return '';
}

function extractDateLabel(fullText, allLines) {
  const normalizedText = normalizeSpaces(fullText);
  const fromFullText = normalizedText.match(
    /Fecha:\s*([0-9]{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4})/i
  );
  if (fromFullText) return normalizeSpaces(fromFullText[1]);

  for (const line of allLines) {
    const cleaned = cleanLine(line);
    const match = cleaned.match(
      /Fecha:\s*([0-9]{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4})/i
    );
    if (match) return normalizeSpaces(match[1]);
  }

  const mergedHeader = allLines.slice(0, 12).map(cleanLine).join(' ');
  const fallback = mergedHeader.match(
    /([0-9]{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4})/i
  );
  return fallback ? normalizeSpaces(fallback[1]) : '';
}

function extractCedis(fullText, allLines) {
  const fromLine =
    extractSingleLineValue(allLines, 'Cedis') ||
    extractSingleLineValue(allLines, 'CEDIS');

  if (fromLine) return cleanCedisValue(fromLine);

  const fromFullText = extractValueFromFullText(fullText, 'Cedis');
  if (fromFullText) return cleanCedisValue(fromFullText);

  const normalizedText = normalizeSpaces(fullText);
  const direct = normalizedText.match(/Cedis:\s*([A-ZÁÉÍÓÚÑ0-9 ._-]+)/i);
  if (direct) return cleanCedisValue(direct[1]);

  const mergedHeader = allLines.slice(0, 12).map(cleanLine).join(' ');
  const headerMatch = mergedHeader.match(/Cedis:\s*([A-ZÁÉÍÓÚÑ0-9 ._-]+)/i);
  if (headerMatch) return cleanCedisValue(headerMatch[1]);

  return '';
}

function extractTotalGeneral(fullText) {
  const normalizedText = normalizeSpaces(fullText);

  const match = normalizedText.match(
    /TOTAL GENERAL\.-\s*([-\d,]+)\s+([-\d,]+)/i
  );

  if (!match) {
    return {
      totalGeneral: 0,
      totalGeneralNoDisponible: 0,
    };
  }

  return {
    totalGeneral: parseNumber(match[1]),
    totalGeneralNoDisponible: parseNumber(match[2]),
  };
}

function extractMetaFromLines(allLines, fullText) {
  const week = extractWeek(fullText, allLines);
  const dateLabel = extractDateLabel(fullText, allLines);
  const dateKey = parseSpanishDateToKey(dateLabel);
  const cedis = extractCedis(fullText, allLines);
  const totals = extractTotalGeneral(fullText);

  return {
    week,
    dateLabel,
    dateKey,
    cedis,
    totalGeneral: totals.totalGeneral,
    totalGeneralNoDisponible: totals.totalGeneralNoDisponible,
  };
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se recibió archivo.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = function () {
      resolve(reader.result);
    };

    reader.onerror = function () {
      reject(new Error('No se pudo leer el archivo PDF.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;

  try {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches
    );
  } catch {
    return false;
  }
}

function isLegacyStandalone() {
  if (typeof navigator === 'undefined') return false;
  return typeof navigator.standalone === 'boolean' && navigator.standalone;
}

function isAppleMobileEnvironment() {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const isiPhoneOrIPad =
    /iPhone|iPad|iPod/i.test(ua) || /iPhone|iPad|iPod/i.test(platform);

  const isModernIPadOnMac = /Mac/i.test(platform) && maxTouchPoints > 1;

  return isiPhoneOrIPad || isModernIPadOnMac;
}

function shouldDisableWorker() {
  return (
    isAppleMobileEnvironment() || isStandaloneMode() || isLegacyStandalone()
  );
}

async function extractLinesFromPdf(file) {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const data = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data,
    disableWorker: shouldDisableWorker(),
    isEvalSupported: false,
    useSystemFonts: true,
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
    stopAtErrors: false,
  });

  let pdf;

  try {
    pdf = await loadingTask.promise;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'No se pudo abrir el PDF.';

    if (
      /worker/i.test(message) ||
      /arraybuffer/i.test(message) ||
      /webkit/i.test(message) ||
      /safari/i.test(message) ||
      /unsupported/i.test(message)
    ) {
      throw new Error(
        'El iPhone pudo seleccionar el archivo, pero falló al procesar el PDF. Abre esta misma página en Safari normal o usa otro dispositivo.'
      );
    }

    throw new Error(message);
  }

  try {
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();

      const rowsMap = new Map();

      for (let i = 0; i < textContent.items.length; i += 1) {
        const item = textContent.items[i];
        if (!item || !item.str || !String(item.str).trim()) continue;

        const x = item.transform?.[4] ?? 0;
        const y = Math.round(item.transform?.[5] ?? 0);

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
        .map((entry) => {
          const rowItems = entry[1];

          return rowItems
            .sort((a, b) => a.x - b.x)
            .map((part) => part.text)
            .join(' ');
        })
        .map(cleanLine)
        .filter(Boolean);

      pages.push(rows);
    }

    return pages;
  } finally {
    try {
      await loadingTask.destroy();
    } catch {
      // noop
    }
  }
}

function buildCategoryKey(category) {
  return [
    category?.supplierCode || '',
    category?.categoryCode || '',
    category?.categoryName || '',
  ].join('::');
}

function computeItemStatus(quantity, noDisponible) {
  if (safeNumber(quantity) <= 0) return 'FALTANTE';
  if (safeNumber(noDisponible) > 0) return 'ALERTA';
  return 'OK';
}

function buildTotals(items = [], categories = []) {
  return {
    totalGeneralCalculado: items.reduce(
      (sum, item) => sum + parseNumber(item?.expectedQuantity),
      0
    ),
    totalGeneralNoDisponibleCalculado: items.reduce(
      (sum, item) => sum + parseNumber(item?.unavailableQuantity),
      0
    ),
    productCount: items.length,
    categoryCount: categories.length,
  };
}

export async function parseInventoryPdf(file) {
  try {
    if (!file) {
      throw new Error('No se recibió ningún archivo PDF.');
    }

    const fileName = String(file.name || '').toLowerCase();
    const fileType = String(file.type || '').toLowerCase();

    if (
      fileType &&
      fileType !== 'application/pdf' &&
      !fileName.endsWith('.pdf')
    ) {
      throw new Error('El archivo seleccionado no es un PDF válido.');
    }

    const pages = await extractLinesFromPdf(file);
    const allLines = flattenPages(pages);
    const fullText = allLines.join('\n');

    const meta = extractMetaFromLines(allLines, fullText);

    if (!meta.dateKey) {
      throw new Error('No se pudo detectar la fecha del PDF.');
    }

    if (!meta.cedis) {
      throw new Error('No se pudo detectar el CEDIS del PDF.');
    }

    let currentCategory = null;
    const categoriesMap = new Map();
    const items = [];

    for (let i = 0; i < allLines.length; i += 1) {
      const rawLine = allLines[i];
      const line = cleanLine(rawLine);

      if (!line || isDecorativeLine(line)) continue;

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
            fullName: currentCategory.fullName,
            itemCount: 0,
            quantityTotal: 0,
            noDisponibleTotal: 0,
          });
        }

        continue;
      }

      if (isTotalLine(line)) continue;

      const parsedProduct = parseProductLine(line);

      if (!parsedProduct || !currentCategory) continue;

      const categoryKey = buildCategoryKey(currentCategory);
      const categoryRef = categoriesMap.get(categoryKey);

      const status = computeItemStatus(
        parsedProduct.quantity,
        parsedProduct.noDisponible
      );

      const item = {
        itemKey: [
          currentCategory.supplierCode,
          currentCategory.categoryCode,
          parsedProduct.productName,
        ].join('::'),
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
      String(a.fullName || a.categoryName || '').localeCompare(
        String(b.fullName || b.categoryName || ''),
        'es',
        { sensitivity: 'base' }
      )
    );

    const totals = buildTotals(items, categories);

    return {
      sourceFileName: file.name,
      week: meta.week,
      dateLabel: meta.dateLabel,
      dateKey: meta.dateKey,
      cedis: meta.cedis,
      totalGeneral: meta.totalGeneral,
      totalGeneralNoDisponible: meta.totalGeneralNoDisponible,
      totals,
      categories,
      items,
      rawPages: pages,
    };
  } catch (error) {
    console.error('Error en parseInventoryPdf:', error);

    if (error instanceof Error && error.message) {
      throw error;
    }

    throw new Error('No se pudo procesar el PDF en este dispositivo.');
  }
}
