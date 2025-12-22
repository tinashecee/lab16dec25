declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface UserOptions {
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    startY?: number;
    margin?: Margin;
    pageBreak?: 'auto' | 'avoid' | 'always';
    rowPageBreak?: 'auto' | 'avoid';
    tableWidth?: 'auto' | 'wrap' | number;
    showHead?: 'everyPage' | 'firstPage' | 'never';
    showFoot?: 'everyPage' | 'lastPage' | 'never';
    tableLineWidth?: number;
    tableLineColor?: number[];
    theme?: 'striped' | 'grid' | 'plain';
    styles?: Styles;
    headStyles?: Styles;
    bodyStyles?: Styles;
    footStyles?: Styles;
    alternateRowStyles?: Styles;
    columnStyles?: {
      [key: number]: Styles;
    };
    didParseCell?: (data: CellHookData) => void;
    willDrawCell?: (data: CellHookData) => void;
    didDrawCell?: (data: CellHookData) => void;
    didDrawPage?: (data: HookData) => void;
  }

  interface Styles {
    font?: string;
    fontStyle?: string;
    fontSize?: number;
    lineColor?: number[];
    lineWidth?: number;
    cellPadding?: number;
    fillColor?: number[];
    textColor?: number[];
    halign?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
    fillStyle?: 'F' | 'FD' | 'DF';
    minCellHeight?: number;
    cellWidth?: 'auto' | 'wrap' | number;
  }

  interface CellHookData {
    table: any;
    cell: any;
    row: any;
    column: any;
    section: 'head' | 'body' | 'foot';
  }

  interface HookData {
    table: any;
    pageNumber: number;
    pageCount: number;
    settings: any;
    doc: any;
  }

  interface Margin {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  }

  function autoTable(doc: jsPDF, options: UserOptions): void;
  export default autoTable;
}
