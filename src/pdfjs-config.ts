import { GlobalWorkerOptions } from "pdfjs-dist";

// Use the worker from the pdfjs-dist package
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

GlobalWorkerOptions.workerSrc = pdfjsWorker;

export {};
