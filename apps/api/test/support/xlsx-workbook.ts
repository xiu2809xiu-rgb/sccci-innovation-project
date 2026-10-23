import { strToU8, zipSync } from 'fflate';

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const RELATIONSHIPS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DOCUMENT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

/**
 * A minimal .xlsx workbook with one sheet, for reader tests: each row goes at
 * the row number given, so rows left out read as empty rows, and every cell is
 * an inline string.
 */
export function workbook(rows: readonly { row: number; cells: readonly string[] }[]): Buffer {
  const column = (index: number) => String.fromCharCode(65 + index);
  const sheetData = rows
    .map(
      ({ row, cells }) =>
        `<row r="${String(row)}">${cells
          .map(
            (text, index) =>
              `<c r="${column(index)}${String(row)}" t="inlineStr"><is><t>${text}</t></is></c>`,
          )
          .join('')}</row>`,
    )
    .join('');
  const parts: Record<string, string> = {
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="${RELATIONSHIPS}"><Relationship Id="rId1" Type="${DOCUMENT}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${XML}<workbook xmlns="${MAIN}" xmlns:r="${DOCUMENT}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML}<Relationships xmlns="${RELATIONSHIPS}"><Relationship Id="rId1" Type="${DOCUMENT}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `${XML}<worksheet xmlns="${MAIN}"><sheetData>${sheetData}</sheetData></worksheet>`,
  };
  return Buffer.from(
    zipSync(Object.fromEntries(Object.entries(parts).map(([name, xml]) => [name, strToU8(xml)]))),
  );
}
