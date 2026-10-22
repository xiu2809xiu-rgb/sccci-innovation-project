# Dates, time zones, effective dates and encodings

One page for how HuiTong reads and stores dates, times and text, so that each new source is connected the same way (story [A-7](../agile/backlog.md#a-7-read-chinese-csv-encodings-safely)). Adopted from Azri's integrated plan. Everything here describes the mocks until the client confirms its real systems ([Q-18](../client/questions-for-client.md)).

## The rule

- **Calendar dates** (a hire date, a leave day) are dates, not instants. They are stored as PostgreSQL `DATE`, travel as `YYYY-MM-DD`, and are never shifted by a time zone.
- **Instants** (when a record changed, when a sync ran) are stored as `timestamptz` in UTC and travel as ISO 8601 with an offset.
- **A time without an offset** is read in its source's documented zone, never in the server's.
- **Text** is UTF-8 inside HuiTong. Files are decoded once, on the way in.

## Each source

| Source                    | Calendar dates                                                                                                                                                                                                                                                              | Times                                                                                                                                                                                                                                  | Text                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| SG HR (`mock-sg-hr`)      | `YYYY-MM-DD`: `hireDate`, `resignationDate`, `dateOfBirth`; leave days. Its CSV exports write `DD/MM/YYYY`, pay periods as `MM/YYYY`, and the day in Singapore for when a leave was applied for ([INFO-TECH-style exports](../api/mock-systems.md#info-tech-style-exports)) | `lastModified`: ISO 8601 in UTC. Clock-in and clock-out: `HH:MM` local time in Asia/Singapore                                                                                                                                          | JSON, UTF-8, English keys                                    |
| CN HQ (`mock-cn-hq`)      | `YYYY/MM/DD`: 入职日期, 离职日期 (empty when none), 出生日期; 开始日期 and 结束日期 of leave                                                                                                                                                                                | 最后修改时间: `YYYY/MM/DD HH:mm:ss` in China Standard Time (UTC+8), read as `+08:00` ([`source-timestamps.ts`](../../apps/api/src/modules/employees/source-timestamps.ts)). 上班打卡 and 下班打卡: `HH:MM` local time in Asia/Shanghai | JSON, UTF-8, Chinese keys                                    |
| OA (`mock-oa`)            | Form fields such as 期望到岗日期: `YYYY-MM-DD`                                                                                                                                                                                                                              | `occurredAt` of each event: ISO 8601 with offset; the HMAC timestamp header is Unix seconds                                                                                                                                            | JSON, UTF-8, Chinese form keys                               |
| An uploaded file (wizard) | Whichever layout the mapping names: `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYYMMDD`, `DD/MM/YYYY`, `MM/DD/YYYY` or `DD.MM.YYYY`; Excel date cells arrive as dates                                                                                                                    | Not read                                                                                                                                                                                                                               | CSV in UTF-8 or GB18030 (see below); Excel is Unicode inside |

**Day first or month first.** `01/03/2024` could be 1 March or 3 January. The wizard shows each date column's shape, judged from its values: a part above 12 settles it ("day first"); otherwise it says "day or month first", and HR confirms the layout in the review before approving ([`sample-shapes.ts`](../../apps/api/src/modules/mapping/proposals/sample-shapes.ts)). A value that does not fit the approved layout is reported as unmappable, never guessed ([`date.transformer.ts`](../../apps/api/src/modules/mapping/transformers/date.transformer.ts)).

## Time zones

| Entity | Zone              | Offset today |
| ------ | ----------------- | ------------ |
| SG01   | Asia/Singapore    | UTC+8        |
| CN01   | Asia/Shanghai     | UTC+8        |
| MY01   | Asia/Kuala_Lumpur | UTC+8        |

All three are UTC+8 without daylight saving today, but no code relies on that: each entity's zone is stored with it ([`LegalEntity.timezone`](../../apps/api/prisma/schema.prisma)), so a subsidiary in another zone needs no code change. The web app shows calendar dates exactly as stored (formatted in UTC, so the day never moves) and instants in the viewer's own time zone ([`formatters.ts`](../../apps/web/src/lib/formatters.ts)).

## Effective dates

- **Hire and termination dates** are effective calendar dates in the employee's entity zone.
- **A change takes effect when it is applied.** A source's new value reaches the master when HR applies the sync that carries it. The master keeps when each source value was observed and when it changed the record, and the source's own change time where it gives one.
- **Future-dated changes are not modelled.** If a source sends a change that is meant to start next month, such as a transfer, HuiTong applies it on sync. Whether the client's exports carry future-dated changes is open ([A-58](../assumptions.md), [Q-18](../client/questions-for-client.md)).
- **Leave and attendance** (area 3, when built) are counted in calendar days in the entity's zone, and reporting months are the entity's local months.

## Text encodings

Inside HuiTong everything is UTF-8: the database, the API and the files it writes. A CSV sample in the mapping wizard is decoded once, on upload ([`text-encoding.ts`](../../apps/api/src/modules/mapping/proposals/text-encoding.ts)):

| The bytes                                                      | HuiTong reads them as                                                                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start with a UTF-8 byte-order mark, or are plain ASCII         | UTF-8                                                                                                                                                                     |
| Valid UTF-8 only                                               | UTF-8                                                                                                                                                                     |
| Valid GB18030 only, and look like Chinese text                 | GB18030, which covers GBK and GB2312, the encodings Chinese-locale Excel uses for "CSV"                                                                                   |
| Valid as both, and the GB18030 reading looks like Chinese text | Uncertain: the wizard shows the header row both ways, and HR chooses ([`encoding-choice.tsx`](../../apps/web/src/features/connectors/mapping-wizard/encoding-choice.tsx)) |
| Anything else (Windows-1252, UTF-16, Shift-JIS)                | Refused, with the advice to save the file from Excel as "CSV UTF-8 (Comma delimited)"                                                                                     |

"Look like Chinese text" means that most two-byte characters fall in the GB2312 block, where everyday Chinese lives. Decoding is strict: an invalid byte refuses the file instead of becoming a replacement character. Big5 (Traditional Chinese) is not supported, and its bytes can pass as GB18030; the review step would then show garbled headers, and HR rejects the proposal and saves the file as UTF-8. Excel workbooks (`.xlsx`) are Unicode inside and need no detection; legacy `.xls` files are not accepted.

The test fixtures in [`apps/api/test/fixtures/encodings/`](../../apps/api/test/fixtures/encodings/README.md) cover each row of this table.
