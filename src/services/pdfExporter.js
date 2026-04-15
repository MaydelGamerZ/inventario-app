// src/services/pdfExporter.js
// Este módulo genera un PDF con el inventario agrupado por categorías
// y resumido por estado. Utiliza jsPDF y el plugin jspdf-autotable.
// Las librerías se cargan dinámicamente al invocarse la función.

/**
 * Exporta un inventario a un archivo PDF y lo descarga.
 * Agrupa los productos por categoría e incluye columnas
 * para el stock esperado, no disponible, conteo en buen estado,
 * caducado, dañado y el total contado. Al final muestra un resumen
 * general con las sumas de cada columna.
 *
 * @param {object} inventory - Inventario con date/dateKey, week,
 * cedis, categories e items. Cada item puede tener un arreglo countEntries
 * con campos quantity y observationType.
 */
export async function exportInventoryToPDF(inventory) {
  if (!inventory) {
    console.error('No se proporcionó un inventario válido para exportar');
    return;
  }

  // Importa las librerías cuando se necesiten
  const jsPDFModule = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const { jsPDF } = jsPDFModule;
  const autoTable = autoTableModule.default || autoTableModule;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado principal
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Informe de Inventario Diario', pageWidth / 2, 15, {
    align: 'center',
  });

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const dateLabel = inventory.date || inventory.dateKey || '';
  doc.text(`Fecha: ${dateLabel}`, 14, 25);
  doc.text(`Semana: ${inventory.week || '-'}`, 14, 30);
  doc.text(`Cedis: ${inventory.cedis || '-'}`, 14, 35);

  let currentY = 40;

  // Totales generales
  const generalTotals = {
    expected: 0,
    unavailable: 0,
    good: 0,
    expired: 0,
    damaged: 0,
    totalCount: 0,
  };

  // Agrupar por categorías y calcular subtotales
  const groupedItems = {};
  const categoriesMap = {};

  (inventory.items || []).forEach((item) => {
    const categoryName = item.categoryName || 'Sin categoría';
    const supplierName = item.supplierName || '';
    if (!groupedItems[categoryName]) groupedItems[categoryName] = [];

    // Cuenta cantidades según observationType
    const entries = Array.isArray(item.countEntries) ? item.countEntries : [];
    let countGood = 0;
    let countExpired = 0;
    let countDamaged = 0;
    entries.forEach((entry) => {
      const qty = Number(entry.quantity) || 0;
      const type = String(entry.observationType || '').toLowerCase();
      if (type.includes('caducado')) {
        countExpired += qty;
      } else if (type.includes('dañado') || type.includes('danado')) {
        countDamaged += qty;
      } else {
        countGood += qty;
      }
    });
    const totalCount = countGood + countExpired + countDamaged;

    groupedItems[categoryName].push({
      productName: item.productName,
      expected: Number(item.expectedQuantity) || 0,
      unavailable: Number(item.unavailableQuantity) || 0,
      good: countGood,
      expired: countExpired,
      damaged: countDamaged,
      totalCount,
    });

    // Inicializa o acumula totales de categoría
    if (!categoriesMap[categoryName]) {
      categoriesMap[categoryName] = {
        categoryName,
        supplierName,
        itemCount: 0,
        expected: 0,
        unavailable: 0,
        good: 0,
        expired: 0,
        damaged: 0,
        totalCount: 0,
      };
    }
    const catTotals = categoriesMap[categoryName];
    catTotals.itemCount += 1;
    catTotals.expected += Number(item.expectedQuantity) || 0;
    catTotals.unavailable += Number(item.unavailableQuantity) || 0;
    catTotals.good += countGood;
    catTotals.expired += countExpired;
    catTotals.damaged += countDamaged;
    catTotals.totalCount += totalCount;

    // Actualiza los totales generales
    generalTotals.expected += Number(item.expectedQuantity) || 0;
    generalTotals.unavailable += Number(item.unavailableQuantity) || 0;
    generalTotals.good += countGood;
    generalTotals.expired += countExpired;
    generalTotals.damaged += countDamaged;
    generalTotals.totalCount += totalCount;
  });

  // Lista ordenada de categorías
  const categoriesList = Object.values(categoriesMap).sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName)
  );

  // Cabeceras de la tabla
  const head = [
    [
      'Producto',
      'Esperado',
      'No disponible',
      'Buen estado',
      'Caducado',
      'Dañado',
      'Total contado',
    ],
  ];

  // Dibuja cada tabla de categoría
  categoriesList.forEach((cat) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(
      `Categoría: ${cat.categoryName}${
        cat.supplierName ? ' — ' + cat.supplierName : ''
      }`,
      14,
      currentY
    );
    currentY += 5;

    const body = groupedItems[cat.categoryName].map((item) => [
      String(item.productName || ''),
      String(item.expected),
      String(item.unavailable),
      String(item.good),
      String(item.expired),
      String(item.damaged),
      String(item.totalCount),
    ]);

    // Fila de totales de categoría
    body.push([
      'Total',
      String(cat.expected),
      String(cat.unavailable),
      String(cat.good),
      String(cat.expired),
      String(cat.damaged),
      String(cat.totalCount),
    ]);

    autoTable(doc, {
      startY: currentY,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: [34, 34, 34], textColor: [255, 255, 255] },
      bodyStyles: { textColor: [50, 50, 50], fontSize: 8 },
      footStyles: {
        fillColor: [230, 230, 230],
        textColor: [50, 50, 50],
        fontStyle: 'bold',
      },
      margin: { left: 14, right: 14 },
      styles: { overflow: 'linebreak' },
    });

    currentY = doc.lastAutoTable.finalY + 10;
  });

  // Resumen general
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text('Resumen general', 14, currentY);
  currentY += 5;

  const summaryHead = [
    [
      'Esperado',
      'No disponible',
      'Buen estado',
      'Caducado',
      'Dañado',
      'Total contado',
    ],
  ];
  const summaryBody = [
    [
      String(generalTotals.expected),
      String(generalTotals.unavailable),
      String(generalTotals.good),
      String(generalTotals.expired),
      String(generalTotals.damaged),
      String(generalTotals.totalCount),
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: summaryHead,
    body: summaryBody,
    theme: 'grid',
    headStyles: { fillColor: [34, 34, 34], textColor: [255, 255, 255] },
    bodyStyles: { textColor: [50, 50, 50] },
    margin: { left: 14, right: 14 },
  });

  const filename = `inventario-${inventory.dateKey || inventory.date || 'reporte'}.pdf`;
  doc.save(filename);
}
