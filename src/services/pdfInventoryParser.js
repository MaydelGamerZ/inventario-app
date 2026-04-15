import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function parseInventoryPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const strings = content.items.map((item) => item.str);
    fullText += strings.join(' ') + '\n';
  }

  return processText(fullText);
}

function processText(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let categories = [];
  let currentCategory = null;
  let products = [];

  for (let line of lines) {
    // Detectar categoría
    if (line.match(/^\d{2}\s-\s/)) {
      currentCategory = line;
      categories.push({
        name: line,
        products: [],
      });
      continue;
    }

    // Detectar producto con cantidad
    const match = line.match(/(.+?)\s([\d,]+)\s0$/);

    if (match && currentCategory) {
      const name = match[1].trim();
      const quantity = Number(match[2].replace(/,/g, ''));

      const product = {
        name,
        quantity,
        category: currentCategory,
      };

      products.push(product);

      const cat = categories.find((c) => c.name === currentCategory);
      if (cat) {
        cat.products.push(product);
      }
    }
  }

  return {
    categories,
    products,
  };
}
