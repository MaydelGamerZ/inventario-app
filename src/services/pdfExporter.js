// src/services/pdfExporter.js
// Exportador PDF del inventario diario.
// Genera un reporte agrupado por categoría con resumen general.
// Usa jsPDF y jspdf-autotable de forma dinámica.

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeObservationType(value) {
  const text = safeString(value).toLowerCase();

  if (text.includes('caducado')) return 'CADUCADO';
  if (text.includes('dañado') || text.includes('danado')) return 'DAÑADO';
  if (text.includes('maltratado')) return 'DAÑADO';
  if (text.includes('exhibición') || text.includes('exhibicion'))
    return 'EXHIBICION';
  if (text.includes('otro')) return 'OTRO';

  return 'BUEN_ESTADO';
}

function buildCountSummary(item) {
  const entries = Array.isArray(item?.countEntries) ? item.countEntries : [];

  const summary = {
    good: 0,
    expired: 0,
    damaged: 0,
    exhibition: 0,
    other: 0,
    totalCount: 0,
  };

  entries.forEach((entry) => {
    const qty = safeNumber(entry?.quantity);
    const type = normalizeObservationType(entry?.observationType);

    if (type === 'CADUCADO') summary.expired += qty;
    else if (type === 'DAÑADO') summary.damaged += qty;
    else if (type === 'EXHIBICION') summary.exhibition += qty;
    else if (type === 'OTRO') summary.other += qty;
    else summary.good += qty;

    summary.totalCount += qty;
  });

  return summary;
}

function formatInventoryDate(inventory) {
  return (
    safeString(inventory?.date) || safeString(inventory?.dateKey) || 'Sin fecha'
  );
}

function buildFilename(inventory) {
  const raw = safeString(inventory?.dateKey || inventory?.date || 'reporte');
  const clean = raw.replace(/[^\w\-]+/g, '-');
  return `inventario-${clean}.pdf`;
}

function sortCategories(a, b) {
  return safeString(a).localeCompare(safeString(b), 'es', {
    sensitivity: 'base',
  });
}

/**
 * Exporta un inventario a un archivo PDF y lo descarga.
 * @param {object} inventory
 */
export async function exportInventoryToPDF(inventory) {
  if (!inventory || typeof inventory !== 'object') {
    console.error('No se proporcionó un inventario válido para exportar.');
    return;
  }

  const items = Array.isArray(inventory.items) ? inventory.items : [];

  if (items.length === 0) {
    console.error('El inventario no tiene productos para exportar.');
    return;
  }

  const jsPDFModule = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');

  const { jsPDF } = jsPDFModule;
  const autoTable = autoTableModule.default || autoTableModule;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let currentY = 14;

  const inventoryDate = formatInventoryDate(inventory);

  // Encabezado principal
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text('Informe de Inventario Diario', pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 8;

  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  doc.text(`Fecha: ${inventoryDate}`, marginX, currentY);
  currentY += 5;
  doc.text(`Semana: ${safeString(inventory.week) || '-'}`, marginX, currentY);
  currentY += 5;
  doc.text(`Cedis: ${safeString(inventory.cedis) || '-'}`, marginX, currentY);
  currentY += 5;
  doc.text(
    `Productos: ${items.length.toLocaleString('es-MX')}`,
    marginX,
    currentY
  );

  currentY += 8;

  // Totales generales
  const generalTotals = {
    expected: 0,
    unavailable: 0,
    good: 0,
    expired: 0,
    damaged: 0,
    exhibition: 0,
    other: 0,
    totalCount: 0,
  };

  // Agrupación por categoría
  const groupedItems = {};
  const categoriesMap = {};

  items.forEach((item) => {
    const categoryName = safeString(item?.categoryName) || 'Sin categoría';
    const productName = safeString(item?.productName) || 'Sin nombre';
    const supplierName = safeString(item?.supplierName);

    if (!groupedItems[categoryName]) {
      groupedItems[categoryName] = [];
    }

    const expected = safeNumber(item?.expectedQuantity);
    const unavailable = safeNumber(item?.unavailableQuantity);
    const counts = buildCountSummary(item);

    groupedItems[categoryName].push({
      productName,
      supplierName,
      expected,
      unavailable,
      good: counts.good,
      expired: counts.expired,
      damaged: counts.damaged,
      exhibition: counts.exhibition,
      other: counts.other,
      totalCount: counts.totalCount,
    });

    if (!categoriesMap[categoryName]) {
      categoriesMap[categoryName] = {
        categoryName,
        itemCount: 0,
        expected: 0,
        unavailable: 0,
        good: 0,
        expired: 0,
        damaged: 0,
        exhibition: 0,
        other: 0,
        totalCount: 0,
      };
    }

    const catTotals = categoriesMap[categoryName];
    catTotals.itemCount += 1;
    catTotals.expected += expected;
    catTotals.unavailable += unavailable;
    catTotals.good += counts.good;
    catTotals.expired += counts.expired;
    catTotals.damaged += counts.damaged;
    catTotals.exhibition += counts.exhibition;
    catTotals.other += counts.other;
    catTotals.totalCount += counts.totalCount;

    generalTotals.expected += expected;
    generalTotals.unavailable += unavailable;
    generalTotals.good += counts.good;
    generalTotals.expired += counts.expired;
    generalTotals.damaged += counts.damaged;
    generalTotals.exhibition += counts.exhibition;
    generalTotals.other += counts.other;
    generalTotals.totalCount += counts.totalCount;
  });

  const categoryNames = Object.keys(groupedItems).sort(sortCategories);

  const head = [
    [
      'Producto',
      'Esperado',
      'No disp.',
      'Buen estado',
      'Caducado',
      'Dañado',
      'Exhibición',
      'Otro',
      'Total',
    ],
  ];

  categoryNames.forEach((categoryName) => {
    const categoryItems = groupedItems[categoryName] || [];
    const cat = categoriesMap[categoryName];

    if (currentY > 245) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(`Categoría: ${categoryName}`, marginX, currentY);

    currentY += 5;

    const body = categoryItems.map((item) => [
      String(item.productName),
      String(item.expected),
      String(item.unavailable),
      String(item.good),
      String(item.expired),
      String(item.damaged),
      String(item.exhibition),
      String(item.other),
      String(item.totalCount),
    ]);

    body.push([
      'Total categoría',
      String(cat.expected),
      String(cat.unavailable),
      String(cat.good),
      String(cat.expired),
      String(cat.damaged),
      String(cat.exhibition),
      String(cat.other),
      String(cat.totalCount),
    ]);

    autoTable(doc, {
      startY: currentY,
      head,
      body,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        textColor: [50, 50, 50],
        lineColor: [210, 210, 210],
      },
      headStyles: {
        fillColor: [34, 34, 34],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { halign: 'right', cellWidth: 16 },
        2: { halign: 'right', cellWidth: 16 },
        3: { halign: 'right', cellWidth: 18 },
        4: { halign: 'right', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 16 },
        6: { halign: 'right', cellWidth: 18 },
        7: { halign: 'right', cellWidth: 14 },
        8: { halign: 'right', cellWidth: 14 },
      },
      didParseCell(data) {
        const lastRowIndex = body.length - 1;
        if (data.row.index === lastRowIndex) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [235, 235, 235];
        }
      },
    });

    currentY = (doc.lastAutoTable?.finalY || currentY) + 8;
  });

  // Resumen general
  if (currentY > 240) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text('Resumen general', marginX, currentY);

  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Esperado',
        'No disp.',
        'Buen estado',
        'Caducado',
        'Dañado',
        'Exhibición',
        'Otro',
        'Total',
      ],
    ],
    body: [
      [
        String(generalTotals.expected),
        String(generalTotals.unavailable),
        String(generalTotals.good),
        String(generalTotals.expired),
        String(generalTotals.damaged),
        String(generalTotals.exhibition),
        String(generalTotals.other),
        String(generalTotals.totalCount),
      ],
    ],
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      halign: 'right',
      textColor: [50, 50, 50],
    },
    headStyles: {
      fillColor: [34, 34, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: [248, 248, 248],
      fontStyle: 'bold',
    },
  });

  // Pie simple
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, 290, {
      align: 'right',
    });
  }

  doc.save(buildFilename(inventory));
}
