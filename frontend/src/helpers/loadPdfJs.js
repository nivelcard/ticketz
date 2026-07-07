let pdfJsModulePromise = null;

const loadPdfJs = () => {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.entry")
    ]).then(([pdfjs, workerModule]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
      return pdfjs;
    });
  }

  return pdfJsModulePromise;
};

export default loadPdfJs;
