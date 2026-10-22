import { expect, test } from '@playwright/test';

/**
 * E2E #1, the hero journey (docs/agile/hero-journey.md): one new hire, entered
 * once, followed through all four areas to HQ's summary and the overview. The
 * intranet is the `oa` mock. Each step names its owning area, so a failure
 * points to an owner. A step whose story is not built yet is marked fixme with
 * the story key, and is switched on in the pull request that delivers it
 * (story P-9).
 */
const OA_URL = process.env.E2E_OA_URL ?? 'http://127.0.0.1:4103';
const OA_TOKEN = process.env.E2E_OA_TOKEN ?? 'oa-local-token';

interface Delivery {
  eventId: string;
  statusCode: number | null;
  ok: boolean;
}

test.describe('E2E #1: the hero journey', () => {
  test.describe.configure({ mode: 'serial' });

  test("step 1 (area 1 receives, area 2 handles): the intranet's signed approval reaches HuiTong and is accepted", async ({
    request,
  }) => {
    const headers = { Authorization: `Bearer ${OA_TOKEN}` };
    const deliveries = async (): Promise<Delivery[]> => {
      const response = await request.get(`${OA_URL}/openapi/v1/webhooks/deliveries`, { headers });
      expect(response.ok()).toBe(true);
      return ((await response.json()) as { data: { items: Delivery[] } }).data.items;
    };
    const before = new Set((await deliveries()).map((delivery) => delivery.eventId));

    await test.step('a hire is approved in the intranet, every approver signing it off', async () => {
      const simulated = await request.post(`${OA_URL}/openapi/v1/_simulate/manpower-request`, {
        headers,
        data: {},
      });
      expect(simulated.status()).toBe(201);
    });

    await test.step('the intranet delivers the signed approval.completed event, and HuiTong accepts it', async () => {
      // HuiTong answers 2xx only after checking the HMAC signature and storing the event once;
      // a replayed delivery is a no-op, as the API integration tests prove (oa-webhook.int-spec.ts).
      await expect
        .poll(
          async () =>
            (await deliveries()).some((delivery) => !before.has(delivery.eventId) && delivery.ok),
          { timeout: 30_000 },
        )
        .toBe(true);
    });
  });

  test('step 2 (area 2, with area 1): one entry makes a draft PRE_HIRE record and starts onboarding', () => {
    test.fixme(
      true,
      'C-1 and C-2 build the entry and the workflow; B-6 the draft-from-hire use case',
    );
  });

  test("step 3 (area 2, with area 1's connectors): the SAP and INFO-TECH writes follow their stewards' approvals", () => {
    test.fixme(true, 'C-3 builds the approved writes to the SAP and INFO-TECH mocks');
  });

  test('step 4 (area 2): intranet access is requested only once the SAP record exists', () => {
    test.fixme(
      true,
      'C-7 builds the guard; C-4 and C-5 the preparation tasks and notifications; A-10 the intranet mock',
    );
  });

  test('step 5 (area 1): the verified INFO-TECH record activates the draft', () => {
    test.fixme(
      true,
      'B-6 builds the activation rule (onboarding milestones and the verified record)',
    );
  });

  test("step 6 (area 1): the record is reconciled with SAP's by employee number", () => {
    test.fixme(
      true,
      "Needs the journey's hire from steps 2 to 5; matching and possible matches are built (B-5)",
    );
  });

  test('step 7 (area 2): a claim above the threshold waits for HQ Treasury', () => {
    test.fixme(true, 'C-8 builds the Treasury step; A-10 the intranet mock that sends claims');
  });

  test("step 8 (area 3): the employee's later leave and payroll appear in the single view", () => {
    test.fixme(
      true,
      'D-1 and D-2 build leave ingestion and the category mapping; D-6 the single view',
    );
  });

  test("step 9 (areas 3 and 4): HQ's summary holds only the allowlisted fields", () => {
    test.fixme(
      true,
      'D-4 builds the export on the allowlist (B-7, built) and F-4 its administration',
    );
  });

  test("step 10 (all areas): the overview shows the journey's history and exceptions", () => {
    test.fixme(true, 'Needs steps 2 to 9; D-3 adds leave exceptions and F-2 the audit viewer');
  });
});
