import { expect, test } from '@playwright/test';

/**
 * E2E #1, the hero journey (docs/agile/hero-journey.md): one OA manpower
 * approval followed through all four areas, to HQ's report and the overview.
 * Each step names its owning area, so a failure points to an owner. A step
 * whose story is not built yet is marked fixme with the story key, and is
 * switched on in the pull request that delivers it (story P-9).
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

  test("step 1 (area 1 receives, area 2 handles): OA's signed approval reaches HuiTong and is accepted", async ({
    request,
  }) => {
    const headers = { Authorization: `Bearer ${OA_TOKEN}` };
    const deliveries = async (): Promise<Delivery[]> => {
      const response = await request.get(`${OA_URL}/openapi/v1/webhooks/deliveries`, { headers });
      expect(response.ok()).toBe(true);
      return ((await response.json()) as { data: { items: Delivery[] } }).data.items;
    };
    const before = new Set((await deliveries()).map((delivery) => delivery.eventId));

    await test.step('a hiring manager raises a manpower request, and every approver signs it off', async () => {
      const simulated = await request.post(`${OA_URL}/openapi/v1/_simulate/manpower-request`, {
        headers,
        data: {},
      });
      expect(simulated.status()).toBe(201);
    });

    await test.step('OA delivers the signed approval.completed event, and HuiTong accepts it', async () => {
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

  test('step 2 (area 2): the requisition, onboarding checklist and preparation tasks appear', () => {
    test.fixme(true, 'C-1, C-2 and C-4 build the workflow from the approval event');
  });

  test('step 3 (area 1, triggered by area 2): a draft PRE_HIRE record is linked to the request', () => {
    test.fixme(true, 'B-6 with C-3 builds the draft-from-hire use case');
  });

  test('step 4 (area 1): the verified SG HR record activates the draft', () => {
    test.fixme(
      true,
      'B-6 builds the activation rule (onboarding milestones and the verified record)',
    );
  });

  test("step 5 (area 1): the record is reconciled with HQ's by employee number", () => {
    test.fixme(
      true,
      "Needs the journey's hire from steps 3 and 4; matching and possible matches are built (B-5)",
    );
  });

  test("step 6 (area 3): the employee's later leave is imported and mapped", () => {
    test.fixme(true, 'D-1 and D-2 build leave ingestion and the category mapping');
  });

  test("step 7 (areas 3 and 4): HQ's report holds only the allowlisted fields", () => {
    test.fixme(
      true,
      'D-4 builds the export on the allowlist (B-7, built) and F-4 its administration',
    );
  });

  test("step 8 (all areas): the overview shows the journey's history and exceptions", () => {
    test.fixme(true, 'Needs steps 2 to 7; D-3 adds leave exceptions and F-2 the audit viewer');
  });
});
