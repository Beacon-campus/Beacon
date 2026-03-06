import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export async function exportRowsToXlsx({
  rows,
  fileName,
  sheetName = "Sheet1",
  columns = null,
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  const safeRows = Array.isArray(rows) ? rows : [];
  const inferredKeys = safeRows.length > 0 ? Object.keys(safeRows[0]) : [];
  const finalColumns =
    Array.isArray(columns) && columns.length > 0
      ? columns
      : inferredKeys.map((key) => ({
          header: key,
          key,
          width: Math.max(12, String(key).length + 2),
        }));

  worksheet.columns = finalColumns;
  worksheet.addRows(safeRows);

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
}

