# Encoding fixtures

Small CSV and Excel samples for the encoding tests ([`text-encoding.spec.ts`](../../../src/modules/mapping/proposals/text-encoding.spec.ts), [`mapping-proposals.int-spec.ts`](../../mapping-proposals.int-spec.ts)). The rules they test are in [docs/architecture/data-formats.md](../../../../../docs/architecture/data-formats.md). Every person in them is synthetic.

| File                   | What it is                                                                                                            | Read as                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `utf8.csv`             | Chinese headers (员工编号, 姓名, 部门, 入职日期, 在职状态) and three rows, UTF-8 without a byte-order mark            | UTF-8                       |
| `utf8-bom.csv`         | The same text with a UTF-8 byte-order mark (`EF BB BF`), as Excel's "CSV UTF-8" writes it                             | UTF-8                       |
| `gbk.csv`              | The same text in GBK, as Chinese-locale Excel writes a plain "CSV"                                                    | GB18030                     |
| `gb18030.csv`          | The same text in GB18030, with 𠮷 (U+20BB7), which GBK cannot hold and GB18030 writes in four bytes (`95 34 B2 35`)   | GB18030                     |
| `ambiguous.csv`        | GBK text whose bytes are also valid UTF-8 (lead bytes C2 to D7, trail bytes A1 to BF): 隆垄 in GB18030 is ¡¢ in UTF-8 | Uncertain: HR chooses       |
| `windows-1252.csv`     | Latin names with accents (Hélène, José) in Windows-1252                                                               | Refused: save as CSV UTF-8  |
| `chinese-headers.xlsx` | A minimal workbook with Chinese headers and 王𠮷, stored without compression                                          | Unicode inside the workbook |

The bytes were written once with iconv-lite, and the workbook with Node's `zlib.crc32`. Neither tool is a dependency: the product decodes with Node's built-in `TextDecoder`. To inspect a file, run `xxd gbk.csv | head`.
