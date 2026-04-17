// src/services/pdfExporter.js
// Exportador PDF del inventario diario.
// Genera un reporte agrupado por categoría con diseño más claro,
// resumen ejecutivo, subtotales y mejor lectura para impresión.

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString('es-MX');
}

function normalizeObservationType(value) {
  const text = safeString(value).toLowerCase();

  if (text.includes('caducado')) return 'CADUCADO';
  if (text.includes('dañado') || text.includes('danado')) return 'DAÑADO';
  if (text.includes('maltratado')) return 'DAÑADO';
  if (text.includes('mojado')) return 'DAÑADO';
  if (text.includes('exhibición') || text.includes('exhibicion')) {
    return 'EXHIBICION';
  }
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

function safeOrder(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDifferenceLabel(expected, counted) {
  const diff = safeNumber(counted) - safeNumber(expected);
  if (diff > 0) return { value: diff, type: 'SOBRA' };
  if (diff < 0) return { value: Math.abs(diff), type: 'FALTA' };
  return { value: 0, type: 'OK' };
}

function buildGroupedData(items = []) {
  const groupedItems = new Map();
  const categoryTotalsMap = new Map();

  const generalTotals = {
    expected: 0,
    unavailable: 0,
    good: 0,
    expired: 0,
    damaged: 0,
    exhibition: 0,
    other: 0,
    totalCount: 0,
    shortage: 0,
    surplus: 0,
    categories: 0,
    products: 0,
  };

  items.forEach((item) => {
    const categoryName = safeString(item?.categoryName) || 'Sin categoría';
    const categoryKey = [
      safeString(item?.supplierCode),
      safeString(item?.categoryCode),
      categoryName,
    ].join('::');
    const productName = safeString(item?.productName) || 'Sin nombre';
    const supplierName = safeString(item?.supplierName);

    if (!groupedItems.has(categoryKey)) {
      groupedItems.set(categoryKey, []);
    }

    const expected = safeNumber(item?.expectedQuantity);
    const unavailable = safeNumber(item?.unavailableQuantity);
    const counts = buildCountSummary(item);
    const diff = getDifferenceLabel(expected, counts.totalCount);

    const row = {
      productName,
      supplierName,
      itemOrder: safeOrder(item?.itemOrder, items.length),
      expected,
      unavailable,
      good: counts.good,
      expired: counts.expired,
      damaged: counts.damaged,
      exhibition: counts.exhibition,
      other: counts.other,
      totalCount: counts.totalCount,
      shortage: diff.type === 'FALTA' ? diff.value : 0,
      surplus: diff.type === 'SOBRA' ? diff.value : 0,
    };

    groupedItems.get(categoryKey).push(row);

    if (!categoryTotalsMap.has(categoryKey)) {
      categoryTotalsMap.set(categoryKey, {
        categoryName,
        categoryOrder: safeOrder(item?.categoryOrder, categoryTotalsMap.size),
        itemCount: 0,
        expected: 0,
        unavailable: 0,
        good: 0,
        expired: 0,
        damaged: 0,
        exhibition: 0,
        other: 0,
        totalCount: 0,
        shortage: 0,
        surplus: 0,
      });
    }

    const cat = categoryTotalsMap.get(categoryKey);
    cat.itemCount += 1;
    cat.expected += expected;
    cat.unavailable += unavailable;
    cat.good += counts.good;
    cat.expired += counts.expired;
    cat.damaged += counts.damaged;
    cat.exhibition += counts.exhibition;
    cat.other += counts.other;
    cat.totalCount += counts.totalCount;
    cat.shortage += row.shortage;
    cat.surplus += row.surplus;

    generalTotals.expected += expected;
    generalTotals.unavailable += unavailable;
    generalTotals.good += counts.good;
    generalTotals.expired += counts.expired;
    generalTotals.damaged += counts.damaged;
    generalTotals.exhibition += counts.exhibition;
    generalTotals.other += counts.other;
    generalTotals.totalCount += counts.totalCount;
    generalTotals.shortage += row.shortage;
    generalTotals.surplus += row.surplus;
    generalTotals.products += 1;
  });

  generalTotals.categories = groupedItems.size;

  const categoryKeys = Array.from(groupedItems.keys()).sort((a, b) => {
    const aCategory = categoryTotalsMap.get(a);
    const bCategory = categoryTotalsMap.get(b);
    const byOrder =
      safeOrder(aCategory?.categoryOrder) - safeOrder(bCategory?.categoryOrder);

    if (byOrder !== 0) return byOrder;

    return safeString(aCategory?.categoryName).localeCompare(
      safeString(bCategory?.categoryName),
      'es',
      { sensitivity: 'base' }
    );
  });

  return {
    groupedItems,
    categoryTotalsMap,
    generalTotals,
    categoryKeys,
  };
}

function drawHeader(doc, inventory, pageWidth, marginX) {
  const date = formatInventoryDate(inventory);
  const cedis = safeString(inventory?.cedis) || '-';
  const week = safeString(inventory?.week) || '-';

  doc.setFillColor(20, 24, 32);
  doc.roundedRect(marginX, 10, pageWidth - marginX * 2, 24, 4, 4, 'F');

  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text('Informe de Inventario Diario', marginX + 4, 19);

  doc.setFontSize(9);
  doc.setTextColor(220, 220, 220);
  doc.text(`Fecha: ${date}`, marginX + 4, 26);
  doc.text(`Semana: ${week}`, marginX + 48, 26);
  doc.text(`Cedis: ${cedis}`, marginX + 82, 26);
}

function drawSummaryCards(doc, generalTotals, marginX, startY, pageWidth) {
  const gap = 4;
  const cardWidth = (pageWidth - marginX * 2 - gap * 3) / 4;
  const cards = [
    {
      title: 'Categorías',
      value: formatNumber(generalTotals.categories),
    },
    {
      title: 'Productos',
      value: formatNumber(generalTotals.products),
    },
    {
      title: 'Esperado',
      value: formatNumber(generalTotals.expected),
    },
    {
      title: 'Conteo total',
      value: formatNumber(generalTotals.totalCount),
    },
  ];

  cards.forEach((card, index) => {
    const x = marginX + index * (cardWidth + gap);

    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 224, 230);
    doc.roundedRect(x, startY, cardWidth, 18, 3, 3, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(90, 98, 112);
    doc.text(card.title, x + 3, startY + 6);

    doc.setFontSize(12);
    doc.setTextColor(28, 32, 40);
    doc.text(card.value, x + 3, startY + 13);
  });
}

function drawFooter(doc, totalPages, pageWidth, marginX) {
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, 290, {
      align: 'right',
    });
  }
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
  const marginX = 10;
  let currentY = 10;

  const { groupedItems, categoryTotalsMap, generalTotals, categoryKeys } =
    buildGroupedData(items);

  drawHeader(doc, inventory, pageWidth, marginX);
  currentY = 40;

  drawSummaryCards(doc, generalTotals, marginX, currentY, pageWidth);
  currentY += 26;

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
      'Conteo',
      'Falta',
      'Sobra',
    ],
  ];

  categoryKeys.forEach((categoryKey) => {
    const categoryItems = [...(groupedItems.get(categoryKey) || [])].sort(
      (a, b) => safeOrder(a.itemOrder) - safeOrder(b.itemOrder)
    );
    const cat = categoryTotalsMap.get(categoryKey);
    const categoryName = cat?.categoryName || 'Sin categoria';

    if (currentY > 238) {
      doc.addPage();
      drawHeader(doc, inventory, pageWidth, marginX);
      currentY = 40;
    }

    doc.setFillColor(232, 240, 255);
    doc.setDrawColor(180, 200, 235);
    doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 10, 2, 2, 'FD');

    doc.setFontSize(11);
    doc.setTextColor(24, 52, 108);
    doc.text(`Categoría: ${categoryName}`, marginX + 3, currentY + 6.5);

    currentY += 12;

    const body = categoryItems.map((item) => [
      String(item.productName),
      formatNumber(item.expected),
      formatNumber(item.unavailable),
      formatNumber(item.good),
      formatNumber(item.expired),
      formatNumber(item.damaged),
      formatNumber(item.exhibition),
      formatNumber(item.other),
      formatNumber(item.totalCount),
      formatNumber(item.shortage),
      formatNumber(item.surplus),
    ]);

    body.push([
      'Total categoría',
      formatNumber(cat.expected),
      formatNumber(cat.unavailable),
      formatNumber(cat.good),
      formatNumber(cat.expired),
      formatNumber(cat.damaged),
      formatNumber(cat.exhibition),
      formatNumber(cat.other),
      formatNumber(cat.totalCount),
      formatNumber(cat.shortage),
      formatNumber(cat.surplus),
    ]);

    autoTable(doc, {
      startY: currentY,
      head,
      body,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        overflow: 'linebreak',
        textColor: [50, 50, 50],
        lineColor: [220, 220, 220],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [28, 32, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [248, 249, 251],
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { halign: 'right', cellWidth: 14 },
        2: { halign: 'right', cellWidth: 14 },
        3: { halign: 'right', cellWidth: 15 },
        4: { halign: 'right', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 15 },
        6: { halign: 'right', cellWidth: 16 },
        7: { halign: 'right', cellWidth: 12 },
        8: { halign: 'right', cellWidth: 14 },
        9: { halign: 'right', cellWidth: 12 },
        10: { halign: 'right', cellWidth: 12 },
      },
      didParseCell(data) {
        const lastRowIndex = body.length - 1;

        if (data.row.index === lastRowIndex) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [235, 238, 242];
        }
      },
    });

    currentY = (doc.lastAutoTable?.finalY || currentY) + 8;
  });

  if (currentY > 232) {
    doc.addPage();
    drawHeader(doc, inventory, pageWidth, marginX);
    currentY = 40;
  }

  doc.setFillColor(235, 245, 236);
  doc.setDrawColor(190, 220, 192);
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 10, 2, 2, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(32, 90, 42);
  doc.text('Resumen general', marginX + 3, currentY + 6.5);

  currentY += 12;

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Categorías',
        'Productos',
        'Esperado',
        'No disp.',
        'Buen estado',
        'Caducado',
        'Dañado',
        'Exhibición',
        'Otro',
        'Conteo',
        'Falta',
        'Sobra',
      ],
    ],
    body: [
      [
        formatNumber(generalTotals.categories),
        formatNumber(generalTotals.products),
        formatNumber(generalTotals.expected),
        formatNumber(generalTotals.unavailable),
        formatNumber(generalTotals.good),
        formatNumber(generalTotals.expired),
        formatNumber(generalTotals.damaged),
        formatNumber(generalTotals.exhibition),
        formatNumber(generalTotals.other),
        formatNumber(generalTotals.totalCount),
        formatNumber(generalTotals.shortage),
        formatNumber(generalTotals.surplus),
      ],
    ],
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      halign: 'right',
      textColor: [45, 45, 45],
      lineColor: [220, 220, 220],
    },
    headStyles: {
      fillColor: [28, 32, 40],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: [248, 249, 251],
      fontStyle: 'bold',
    },
  });

  const totalPages = doc.internal.getNumberOfPages();
  drawFooter(doc, totalPages, pageWidth, marginX);

  doc.save(buildFilename(inventory));
}
