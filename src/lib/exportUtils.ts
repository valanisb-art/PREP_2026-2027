import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

export function exportTableToXlsx(data: Record<string, any>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.utils.sheet_add_aoa(ws, [], { origin: -1 });
  
  // Auto-width columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(r => String(r[key] || "").length)) + 2
  }));
  ws["!cols"] = colWidths;
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportChartAsImage(chartContainerId: string, filename: string) {
  const el = document.getElementById(chartContainerId);
  if (!el) return;
  const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2 });
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
