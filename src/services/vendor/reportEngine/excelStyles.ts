// src/services/vendor/reportEngine/excelStyles.ts
// ============================================================================
// Joy PeopleHR — Enterprise Excel Styling System (ExcelJS)
// Professional Corporate Aesthetic: Crisp Typography, Clean Fills, Executive Cards
// ============================================================================

import ExcelJS from 'exceljs';

export const COLORS = {
  // Brand colors
  PRIMARY_DARK: 'FF1A4731',     // Joy Deep Forest Green
  PRIMARY_LIGHT: 'FF047857',    // Vibrant Emerald
  SLATE_NAVY: 'FF0F172A',       // Executive Dark Slate
  SLATE_HEADER: 'FF1E293B',     // Table Header Navy
  BRAND_ACCENT: 'FF0284C7',     // Sky Blue Accent
  BRAND_AMBER: 'FFD97706',      // Alert Amber
  BRAND_ROSE: 'FFE11D48',       // Error Rose

  // Background Fills
  FILL_HEADER_PRIMARY: 'FF1A4731',
  FILL_HEADER_SECONDARY: 'FF047857',
  FILL_TABLE_HEADER: 'FF1E293B',
  FILL_TABLE_ZEBRA: 'FFF8FAFC',
  FILL_CARD_BG: 'FFF8FAFC',
  FILL_EMPTY_BANNER: 'FFFEF3C7',
  FILL_TOTAL_ROW: 'FFF1F5F9',
  FILL_WHITE: 'FFFFFFFF',

  // Soft Badges / Matrix Highlights
  BADGE_GREEN_BG: 'FFD1FAE5',
  BADGE_GREEN_FG: 'FF065F46',
  BADGE_RED_BG: 'FFFEE2E2',
  BADGE_RED_FG: 'FF991B1B',
  BADGE_AMBER_BG: 'FFFEF3C7',
  BADGE_AMBER_FG: 'FF92400E',
  BADGE_BLUE_BG: 'FFDBEAFE',
  BADGE_BLUE_FG: 'FF1E40AF',
  BADGE_SLATE_BG: 'FFF1F5F9',
  BADGE_SLATE_FG: 'FF334155',

  // Borders
  BORDER_LIGHT: 'FFE2E8F0',
  BORDER_MEDIUM: 'FFCBD5E1',
  BORDER_DARK: 'FF94A3B8',

  // Text Colors
  TEXT_MAIN: 'FF0F172A',
  TEXT_MUTED: 'FF64748B',
  TEXT_LIGHT: 'FF94A3B8',
  TEXT_WHITE: 'FFFFFFFF',
};

export const FONTS = {
  TITLE_MAIN: { name: 'Segoe UI', size: 14, bold: true, color: { argb: COLORS.TEXT_WHITE } } as ExcelJS.Font,
  SUBTITLE: { name: 'Segoe UI', size: 10, bold: false, color: { argb: 'FFCBD5E1' } } as ExcelJS.Font,
  SECTION_HEADER: { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLORS.TEXT_MAIN } } as ExcelJS.Font,
  TABLE_HEADER: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_WHITE } } as ExcelJS.Font,
  DATA_REGULAR: { name: 'Segoe UI', size: 9, bold: false, color: { argb: COLORS.TEXT_MAIN } } as ExcelJS.Font,
  DATA_BOLD: { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.TEXT_MAIN } } as ExcelJS.Font,
  DATA_MUTED: { name: 'Segoe UI', size: 8.5, color: { argb: COLORS.TEXT_MUTED } } as ExcelJS.Font,
  KPI_VAL: { name: 'Segoe UI', size: 13, bold: true, color: { argb: COLORS.TEXT_MAIN } } as ExcelJS.Font,
  KPI_LABEL: { name: 'Segoe UI', size: 8, bold: true, color: { argb: COLORS.TEXT_MUTED } } as ExcelJS.Font,
  TOTALS_ROW: { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: COLORS.TEXT_MAIN } } as ExcelJS.Font,
  APPROVAL_TITLE: { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: COLORS.TEXT_MUTED } } as ExcelJS.Font,
};

export const BORDERS = {
  THIN_BOX: {
    top: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
    left: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
    bottom: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
    right: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
  } as Partial<ExcelJS.Borders>,
  TOTAL_ROW: {
    top: { style: 'thin', color: { argb: COLORS.BORDER_DARK } },
    bottom: { style: 'double', color: { argb: COLORS.TEXT_MAIN } },
    left: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
    right: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
  } as Partial<ExcelJS.Borders>,
  TABLE_CELL: {
    top: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
    left: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
    bottom: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
    right: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
  } as Partial<ExcelJS.Borders>,
  TABLE_HEADER: {
    top: { style: 'thin', color: { argb: COLORS.SLATE_HEADER } },
    left: { style: 'thin', color: { argb: 'FF334155' } },
    bottom: { style: 'medium', color: { argb: COLORS.SLATE_HEADER } },
    right: { style: 'thin', color: { argb: 'FF334155' } },
  } as Partial<ExcelJS.Borders>,
};

export const NUM_FMTS = {
  HOURS: '0.00',
  COUNT: '#,##0',
  PERCENT: '0.0%',
  CURRENCY: '₹#,##0.00',
  DATE_SHORT: 'dd-mmm',
  DATE_FULL: 'dd-mmm-yyyy',
  TIME: 'hh:mm',
};

export const ALIGN = {
  LEFT: { horizontal: 'left', vertical: 'middle', wrapText: true } as Partial<ExcelJS.Alignment>,
  CENTER: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  RIGHT: { horizontal: 'right', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  HEADER: { horizontal: 'center', vertical: 'middle', wrapText: true } as Partial<ExcelJS.Alignment>,
};

/**
 * Configure standard enterprise print layout on a worksheet
 */
export function applyPrintSetup(
  ws: ExcelJS.Worksheet,
  options: {
    orientation?: 'landscape' | 'portrait';
    printTitlesRow?: string;
    printTitlesColumn?: string;
    companyName: string;
    reportName: string;
    periodLabel: string;
  }
) {
  const orientation = options.orientation || 'landscape';
  ws.pageSetup = {
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9, // A4
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.65,
      bottom: 0.65,
      header: 0.25,
      footer: 0.25,
    },
    printTitlesRow: options.printTitlesRow || '12:12',
    printTitlesColumn: options.printTitlesColumn,
    showGridLines: true,
  };

  ws.headerFooter = {
    oddHeader: `&L&BJoy PeopleHR&R&B${options.companyName} — ${options.reportName}`,
    oddFooter: `&LConfidential — Operational Manpower Report (&D)&CPage &P of &N&R${options.periodLabel}`,
  };
}

/**
 * Auto-fit column widths with sensible safety minimums and padding
 */
export function autoFitColumnWidths(
  ws: ExcelJS.Worksheet,
  minWidths: Record<number, number> = {},
  maxWidth = 45
) {
  ws.columns.forEach((column, colIdx) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellVal = cell.value ? cell.value.toString() : '';
      if (cellVal.includes('\n')) {
        const lines = cellVal.split('\n');
        for (const line of lines) {
          if (line.length > maxLength) maxLength = line.length;
        }
      } else {
        if (cellVal.length > maxLength) maxLength = cellVal.length;
      }
    });

    const specifiedMin = minWidths[colIdx + 1] || 10;
    const computed = Math.min(Math.max(maxLength + 3, specifiedMin), maxWidth);
    column.width = computed;
  });
}
