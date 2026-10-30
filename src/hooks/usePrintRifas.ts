import { useState, useCallback } from 'react';

export function usePrintRifas() {
  const [isPreparingPrint, setIsPreparingPrint] = useState<boolean>(false);
  const [printProgress, setPrintProgress] = useState<string | null>(null);

  const handlePrintBatch = useCallback((totalPages: number) => {
    setIsPreparingPrint(true);
    setPrintProgress(`Preparando lote (${totalPages} ${totalPages === 1 ? 'folha' : 'folhas'})...`);

    // Add print isolation class to body
    document.body.classList.add('printing-rifas');

    const printArea = document.getElementById('print-area-rifas');
    if (printArea) {
      printArea.style.display = 'block';
    }

    let cleanedUp = false;
    const cleanupAfterPrint = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.classList.remove('printing-rifas');
      if (printArea) {
        printArea.style.display = 'none';
      }
      setIsPreparingPrint(false);
      setPrintProgress(null);
      window.removeEventListener('afterprint', cleanupAfterPrint);
      window.removeEventListener('focus', onWindowFocus);
    };

    const onWindowFocus = () => {
      // Delay slightly after window regains focus to let print preview finish if afterprint failed
      setTimeout(cleanupAfterPrint, 1000);
    };

    window.addEventListener('afterprint', cleanupAfterPrint);
    window.addEventListener('focus', onWindowFocus, { once: true });

    // Allow browser layout engine to measure and paginate all sheets before opening print dialog
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.error('Falha ao abrir impressão do navegador:', err);
          cleanupAfterPrint();
        } finally {
          setIsPreparingPrint(false);
          setPrintProgress(null);
        }
      }, 250);
    });
  }, []);

  return {
    isPreparingPrint,
    printProgress,
    handlePrintBatch
  };
}

