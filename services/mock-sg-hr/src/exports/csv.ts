/** A cell in an export: text, a number, or nothing (an empty cell). */
export type CsvValue = string | number | null;

/** One column of an export: its header and how to read the cell from a row. */
export interface CsvColumn<Row> {
  header: string;
  value: (row: Row) => CsvValue;
}

/**
 * U+FEFF. Excel opens a UTF-8 CSV correctly only when it starts with this
 * byte-order mark, so spreadsheet-style exports carry one, as Excel's own
 * "CSV UTF-8" does.
 */
export const BYTE_ORDER_MARK = String.fromCodePoint(0xfeff);

function cell(value: CsvValue): string {
  if (value === null) {
    return '';
  }
  const text = String(value);
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Writes rows as RFC 4180 CSV for Excel: a UTF-8 byte-order mark first, then a
 * header row and one line per row, CRLF line ends, and fields quoted only when
 * they hold a comma, a quote, a line break or surrounding spaces. Values are
 * written as they are, as a vendor's export would write them. HuiTong's own
 * exports (area 3, story D-4) must neutralise cells that a spreadsheet would
 * read as formulas.
 */
export function toCsv<Row>(columns: readonly CsvColumn<Row>[], rows: readonly Row[]): string {
  const lines = [
    columns.map((column) => cell(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => cell(column.value(row))).join(',')),
  ];
  return `${BYTE_ORDER_MARK}${lines.join('\r\n')}\r\n`;
}
