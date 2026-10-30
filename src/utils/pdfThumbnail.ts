// CLASSIUM ENTERPRISE PDF THUMBNAIL & HIGH-FIDELITY RENDER UTILITY

/**
 * Generates a lightweight JPEG Data URL thumbnail for the first page of a PDF file, buffer or URL.
 */
export async function generatePdfThumbnail(
  source: File | ArrayBuffer | string,
  maxWidth = 360,
  maxHeight = 500
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const pdfjs = (window as any).pdfjsLib;
    if (!pdfjs) {
      console.warn('[pdfThumbnail] PDF.js worker/lib not yet available');
      return null;
    }

    let loadingTask: any;
    if (typeof source === 'string') {
      if (source.startsWith('data:image/') || /\.(png|jpe?g|webp)$/i.test(source)) {
        return source; // Already an image
      }
      loadingTask = pdfjs.getDocument(source);
    } else if (source instanceof File) {
      const buffer = await source.arrayBuffer();
      loadingTask = pdfjs.getDocument({ data: buffer });
    } else {
      loadingTask = pdfjs.getDocument({ data: source });
    }

    const pdf = await loadingTask.promise;
    if (!pdf || pdf.numPages < 1) return null;

    const page = await pdf.getPage(1);
    const viewportNormal = page.getViewport({ scale: 1 });

    const scale = Math.min(maxWidth / viewportNormal.width, maxHeight / viewportNormal.height) || 0.4;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    await page.render(renderContext).promise;
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn('[pdfThumbnail] Error generating PDF thumbnail:', err);
    return null;
  }
}
