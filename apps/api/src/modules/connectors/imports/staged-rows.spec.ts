import type { FieldMapping } from '@huitong/shared';
import type { Redis } from 'ioredis';
import { describe, expect, it } from 'vitest';

import { ValidationFailedError } from '../../../common/errors/app-error.js';
import { MappingEngine } from '../../mapping/mapping-engine.js';
import type { SampleFile } from '../../mapping/proposals/sample-file-reader.js';
import { TransformerRegistry } from '../../mapping/transformers/transformer-registry.js';
import { FileImportConnector } from '../adapters/file-import.connector.js';
import type { ExternalRecord } from '../adapters/system-connector.js';
import { StagedImportStore, type StoredImport } from './staged-import.store.js';
import { columnsRead, decodeCell, rejectionsByReason, stageRows } from './staged-rows.js';

const engine = new MappingEngine(new TransformerRegistry());
const copy = { kind: 'copy' } as const;

const MAPPINGS: FieldMapping[] = [
  { target: 'employeeNo', source: 'Employee No', transform: copy, emptyAsNull: true },
  { target: 'fullNameLatin', source: 'Name', transform: copy, emptyAsNull: true },
  {
    target: 'hireDate',
    source: 'Date Joined',
    transform: { kind: 'date', format: 'DD/MM/YYYY' },
    emptyAsNull: true,
  },
  {
    target: 'bankAccountLast4',
    source: 'Bank Account No',
    transform: { kind: 'last-four-digits' },
    emptyAsNull: true,
  },
  {
    target: 'employmentStatus',
    source: null,
    transform: {
      kind: 'rules',
      rules: [
        { when: { Status: 'Active' }, value: 'ACTIVE' },
        { when: {}, value: 'TERMINATED' },
      ],
    },
    emptyAsNull: true,
  },
];

/** A file as the reader returns it; each row on its own line after the header unless `rowInfo` says otherwise. */
function file(
  headers: string[],
  rows: Record<string, unknown>[],
  rowInfo: SampleFile['rowInfo'] = rows.map((_row, index) => ({
    line: index + 2,
    cells: 'match' as const,
  })),
): SampleFile {
  return { headers, rows, rowInfo };
}

const HEADERS = ['Employee No', 'Name', 'Date Joined', 'Bank Account No', 'Status', 'Remarks'];
const ROW = {
  'Employee No': 'E900001',
  Name: 'Quek Shu Ting',
  'Date Joined': '06/01/2020',
  'Bank Account No': '934-284117-7',
  Status: 'Active',
  Remarks: 'kept out',
};

function refusal(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    if (error instanceof ValidationFailedError) return error.message;
    throw error;
  }
  throw new Error('expected the file to be refused');
}

describe('columnsRead', () => {
  it("counts each mapping's source and the columns its rules compare", () => {
    expect([...columnsRead(MAPPINGS)].sort()).toEqual([
      'Bank Account No',
      'Date Joined',
      'Employee No',
      'Name',
      'Status',
    ]);
  });
});

describe('stageRows', () => {
  it('keeps only the columns the mapping reads, and cuts bank accounts to their last four digits', () => {
    const staged = stageRows(file(HEADERS, [ROW]), MAPPINGS, engine);
    expect(staged.records).toEqual([
      {
        externalId: 'E900001',
        payload: {
          'Employee No': 'E900001',
          Name: 'Quek Shu Ting',
          'Date Joined': '06/01/2020',
          'Bank Account No': '••••1177',
          Status: 'Active',
        },
      },
    ]);
    expect(staged.droppedColumns).toEqual([{ header: 'Remarks', reason: 'NOT_MAPPED' }]);
    expect(JSON.stringify(staged.records)).not.toContain('284117');
  });

  it('never keeps a national-ID or gender column, by header or by its values', () => {
    const headers = [...HEADERS, 'NRIC', 'Gender', 'Ref'];
    const staged = stageRows(
      file(headers, [{ ...ROW, NRIC: 'S1234567D', Gender: 'F', Ref: 'T7654321J' }]),
      MAPPINGS,
      engine,
    );
    expect(staged.droppedColumns).toEqual([
      { header: 'Remarks', reason: 'NOT_MAPPED' },
      { header: 'NRIC', reason: 'PROHIBITED' },
      { header: 'Gender', reason: 'PROHIBITED' },
      { header: 'Ref', reason: 'PROHIBITED' },
    ]);
    const stored = JSON.stringify(staged.records);
    expect(stored).not.toContain('S1234567D');
    expect(stored).not.toContain('T7654321J');
  });

  it('refuses a file that lacks a column the mapping reads', () => {
    const headers = HEADERS.filter((h) => h !== 'Status');
    expect(refusal(() => stageRows(file(headers, [ROW]), MAPPINGS, engine))).toBe(
      'The file has no column "Status", which the mapping reads',
    );
  });

  it('refuses a file whose mapped column holds national ID numbers', () => {
    const rows = [{ ...ROW, Name: 'S1234567D' }];
    expect(refusal(() => stageRows(file(HEADERS, rows), MAPPINGS, engine))).toBe(
      'The column "Name" holds national ID numbers, which HuiTong never imports',
    );
  });

  it('leaves out rows without an employee number or with a repeated one, by line only', () => {
    const staged = stageRows(
      file(HEADERS, [ROW, { ...ROW, 'Employee No': null }, { ...ROW, Name: 'Repeat' }]),
      MAPPINGS,
      engine,
    );
    expect(staged.records.map((r) => r.externalId)).toEqual(['E900001']);
    expect(staged.rejectedRows).toEqual([
      { line: 3, reason: 'NO_EMPLOYEE_NUMBER' },
      { line: 4, reason: 'DUPLICATE_EMPLOYEE_NUMBER' },
    ]);
  });

  it('reports a left-out row by the line it starts on, blank lines and long cells counted', () => {
    const rows = [ROW, { ...ROW, 'Employee No': null }];
    const staged = stageRows(
      file(HEADERS, rows, [
        { line: 2, cells: 'match' },
        { line: 6, cells: 'match' },
      ]),
      MAPPINGS,
      engine,
    );
    expect(staged.rejectedRows).toEqual([{ line: 6, reason: 'NO_EMPLOYEE_NUMBER' }]);
  });

  it('leaves out a row whose cells run past the last header, rather than read them shifted', () => {
    const staged = stageRows(
      file(
        HEADERS,
        [ROW, { ...ROW, 'Employee No': 'E900002' }],
        [
          { line: 2, cells: 'match' },
          { line: 3, cells: 'extra' },
        ],
      ),
      MAPPINGS,
      engine,
    );
    expect(staged.records.map((r) => r.externalId)).toEqual(['E900001']);
    expect(staged.rejectedRows).toEqual([{ line: 3, reason: 'EXTRA_CELLS' }]);
  });

  it('leaves out a row with fewer cells than headers, whose values may have shifted left', () => {
    const staged = stageRows(
      file(
        HEADERS,
        [ROW, { ...ROW, 'Employee No': 'E900002' }],
        [
          { line: 2, cells: 'missing' },
          { line: 3, cells: 'match' },
        ],
      ),
      MAPPINGS,
      engine,
    );
    expect(staged.records.map((r) => r.externalId)).toEqual(['E900002']);
    expect(staged.rejectedRows).toEqual([{ line: 2, reason: 'MISSING_CELLS' }]);
  });

  it('leaves out a row with an impossible date, such as a number in a date-formatted cell', () => {
    const staged = stageRows(
      file(HEADERS, [
        { ...ROW, 'Date Joined': new Date(Date.UTC(57260, 0, 1)) },
        { ...ROW, 'Employee No': 'E900002', 'Date Joined': new Date(Number.NaN) },
        { ...ROW, 'Employee No': 'E900003' },
      ]),
      MAPPINGS,
      engine,
    );
    expect(staged.records.map((r) => r.externalId)).toEqual(['E900003']);
    expect(staged.rejectedRows).toEqual([
      { line: 2, reason: 'INVALID_DATE' },
      { line: 3, reason: 'INVALID_DATE' },
    ]);
  });

  it('calls an employee number that is there but unusable malformed, not missing', () => {
    const staged = stageRows(file(HEADERS, [{ ...ROW, 'Employee No': 200101 }]), MAPPINGS, engine);
    expect(staged.rejectedRows).toEqual([{ line: 2, reason: 'INVALID_EMPLOYEE_NUMBER' }]);
  });

  it('judges a bank account column by its header, so 12-digit account numbers do not refuse the file', () => {
    const rows = [
      { ...ROW, 'Bank Account No': '114022334501' },
      { ...ROW, 'Employee No': 'E900002', 'Bank Account No': '800211003345' },
    ];
    const staged = stageRows(file(HEADERS, rows), MAPPINGS, engine);
    expect(staged.rejectedRows).toEqual([]);
    expect(staged.records.map((r) => r.payload['Bank Account No'])).toEqual([
      '••••4501',
      '••••3345',
    ]);
  });

  it('counts the rows each reason left out, with the first line of each', () => {
    expect(
      rejectionsByReason([
        { line: 3, reason: 'INVALID_EMPLOYEE_NUMBER' },
        { line: 5, reason: 'EXTRA_CELLS' },
        { line: 9, reason: 'INVALID_EMPLOYEE_NUMBER' },
      ]),
    ).toEqual([
      { reason: 'INVALID_EMPLOYEE_NUMBER', count: 2, firstLine: 3 },
      { reason: 'EXTRA_CELLS', count: 1, firstLine: 5 },
    ]);
  });

  it('leaves out a malformed employee number by its line, and never stores the value', () => {
    const staged = stageRows(
      file(HEADERS, [
        { ...ROW, 'Employee No': 'E12345' },
        { ...ROW, 'Employee No': 'Quek Shu Ting' },
      ]),
      MAPPINGS,
      engine,
    );
    expect(staged.records).toEqual([]);
    expect(staged.rejectedRows).toEqual([
      { line: 2, reason: 'INVALID_EMPLOYEE_NUMBER' },
      { line: 3, reason: 'INVALID_EMPLOYEE_NUMBER' },
    ]);
    expect(JSON.stringify(staged)).not.toContain('E12345');
  });

  it('leaves out a row with a national ID number in any cell the mapping reads, even in a few rows', () => {
    const rows = [
      ROW,
      { ...ROW, 'Employee No': 'E900002', Name: 'S1234567D' },
      { ...ROW, 'Employee No': 'T7654321J' },
      { ...ROW, 'Employee No': 'E900004', Name: 'Ong Jia Hui' },
    ];
    const staged = stageRows(file(HEADERS, rows), MAPPINGS, engine);
    expect(staged.records.map((r) => r.externalId)).toEqual(['E900001', 'E900004']);
    expect(staged.rejectedRows).toEqual([
      { line: 3, reason: 'NATIONAL_ID_VALUE' },
      { line: 4, reason: 'NATIONAL_ID_VALUE' },
    ]);
    const stored = JSON.stringify(staged);
    expect(stored).not.toContain('S1234567D');
    expect(stored).not.toContain('T7654321J');
  });

  it('cuts every column that feeds the bank account, whatever transform the mapping gives it', () => {
    const copied = MAPPINGS.map((m) =>
      m.target === 'bankAccountLast4' ? { ...m, transform: copy } : m,
    );
    const staged = stageRows(file(HEADERS, [ROW]), copied, engine);
    expect(staged.records[0]?.payload['Bank Account No']).toBe('••••1177');
    expect(JSON.stringify(staged.records)).not.toContain('284117');
  });

  it('does not take a phone number with its country code for a national ID number', () => {
    const withPhone: FieldMapping[] = [
      ...MAPPINGS,
      {
        target: 'workPhone',
        source: 'Phone',
        transform: { kind: 'phone', defaultCountryCode: '60' },
        emptyAsNull: true,
      },
    ];
    // Twelve digits, like a MyKad number without its dashes, in every row.
    const staged = stageRows(
      file(
        [...HEADERS, 'Phone'],
        [
          { ...ROW, Phone: '601123456789' },
          { ...ROW, 'Employee No': 'E900002', Phone: '601198765432' },
        ],
      ),
      withPhone,
      engine,
    );
    expect(staged.rejectedRows).toEqual([]);
    expect(staged.records.map((r) => r.payload.Phone)).toEqual(['601123456789', '601198765432']);
  });

  it('still catches an NRIC in a phone column: only the MyKad shape is let through there', () => {
    const withPhone: FieldMapping[] = [
      ...MAPPINGS,
      {
        target: 'workPhone',
        source: 'Phone',
        transform: { kind: 'phone', defaultCountryCode: '60' },
        emptyAsNull: true,
      },
    ];
    const staged = stageRows(
      file(
        [...HEADERS, 'Phone'],
        [
          { ...ROW, Phone: '601123456789' },
          { ...ROW, 'Employee No': 'E900002', Phone: '601198765432' },
          { ...ROW, 'Employee No': 'E900003', Phone: 'S1234567D' },
        ],
      ),
      withPhone,
      engine,
    );
    expect(staged.rejectedRows).toEqual([{ line: 4, reason: 'NATIONAL_ID_VALUE' }]);
    expect(JSON.stringify(staged)).not.toContain('S1234567D');
  });

  it('still never keeps a column whose header names a national ID, even one mapped as a phone', () => {
    const asPhone: FieldMapping[] = [
      ...MAPPINGS,
      {
        target: 'workPhone',
        source: 'IC No.',
        transform: { kind: 'phone', defaultCountryCode: '60' },
        emptyAsNull: true,
      },
    ];
    expect(
      refusal(() =>
        stageRows(
          file([...HEADERS, 'IC No.'], [{ ...ROW, 'IC No.': '900101-14-5678' }]),
          asPhone,
          engine,
        ),
      ),
    ).toBe('The column "IC No." holds national ID numbers, which HuiTong never imports');
  });

  it('keeps a spreadsheet date cell as a date, so the mapping sees what the reader produced', () => {
    const joined = new Date('2020-01-06T00:00:00.000Z');
    const staged = stageRows(file(HEADERS, [{ ...ROW, 'Date Joined': joined }]), MAPPINGS, engine);
    const cell = staged.records[0]?.payload['Date Joined'] ?? null;
    expect(cell).toEqual({ $date: '2020-01-06T00:00:00.000Z' });
    expect(decodeCell(cell)).toEqual(joined);
  });
});

describe('FileImportConnector', () => {
  const records: StoredImport['records'] = [
    { externalId: 'E900001', payload: { 'Date Joined': { $date: '2020-01-06T00:00:00.000Z' } } },
  ];
  const storeHolding = (stored: StoredImport | null) =>
    new StagedImportStore({
      hgetall: () =>
        Promise.resolve(
          stored === null
            ? {}
            : {
                summary: JSON.stringify(stored.summary),
                stagedByUserId: stored.stagedByUserId,
                sha256: stored.sha256,
                records: JSON.stringify(stored.records),
              },
        ),
    } as unknown as Redis);

  async function rowsFrom(connector: FileImportConnector): Promise<ExternalRecord[]> {
    const rows: ExternalRecord[] = [];
    for await (const page of connector.fetchEmployees()) rows.push(...page);
    return rows;
  }

  it('reads the staged rows, with date cells as dates again', async () => {
    const stored: StoredImport = {
      summary: {
        connectorId: 'my-hr',
        fileName: 'export.csv',
        rowCount: 1,
        rejectedCount: 0,
        rejectedRows: [],
        droppedColumns: [],
        mappingVersion: 1,
        stagedAt: '2026-10-22T08:00:00.000Z',
        expiresAt: '2026-10-22T09:00:00.000Z',
      },
      stagedByUserId: 'user-1',
      sha256: 'a'.repeat(64),
      records,
    };
    const connector = new FileImportConnector('my-hr', storeHolding(stored));
    expect(connector.sourceVersion).toBeNull();
    const rows = await rowsFrom(connector);
    expect(rows).toEqual([
      { externalId: 'E900001', payload: { 'Date Joined': new Date('2020-01-06T00:00:00.000Z') } },
    ]);
    // The change digest takes it in, so an apply reads the very file its preview read.
    expect(connector.sourceVersion).toBe('a'.repeat(64));
  });

  it('refuses to sync without a staged file', async () => {
    await expect(rowsFrom(new FileImportConnector('my-hr', storeHolding(null)))).rejects.toThrow(
      'No file is staged for my-hr, or it expired: stage the file again',
    );
  });
});
