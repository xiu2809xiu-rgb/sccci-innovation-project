import { describe, expect, it } from 'vitest';

import { isSamePerson, possibleMatchReasons, type IdentityFacts } from './identity-matcher.js';

function person(overrides: Partial<IdentityFacts>): IdentityFacts {
  return {
    employeeNo: 'E100001',
    familyName: null,
    givenName: null,
    fullNameLatin: null,
    fullNameLocal: null,
    workEmail: null,
    ...overrides,
  };
}

describe('isSamePerson', () => {
  it('confirms a match on the group employee number only', () => {
    const a = person({ employeeNo: 'E100021', fullNameLatin: 'Tan Wei Ming' });
    expect(isSamePerson(a, person({ employeeNo: 'E100021', fullNameLatin: 'Chen Weiming' }))).toBe(
      true,
    );
    expect(isSamePerson(a, person({ employeeNo: 'E100022', fullNameLatin: 'Tan Wei Ming' }))).toBe(
      false,
    );
  });
});

describe('possibleMatchReasons', () => {
  it('flags the same romanised name for two different Chinese names, as possible only', () => {
    // 陈伟 and 陈玮 are different people who both romanise to "Chen Wei".
    const reasons = possibleMatchReasons(
      person({ employeeNo: 'E100201', fullNameLatin: 'Chen Wei', fullNameLocal: '陈伟' }),
      person({ employeeNo: 'E100202', fullNameLatin: 'Chen Wei', fullNameLocal: '陈玮' }),
    );
    expect(reasons).toEqual(['SAME_LATIN_NAME']);
  });

  it('flags the same Chinese name under different romanisations', () => {
    // Hokkien "Tan" and Mandarin "Chen" are the same surname, 陈.
    expect(
      possibleMatchReasons(
        person({ employeeNo: 'E100203', fullNameLatin: 'Tan Wei Ming', fullNameLocal: '陈伟明' }),
        person({ employeeNo: 'E100204', fullNameLatin: 'Chen Weiming', fullNameLocal: '陈伟明' }),
      ),
    ).toEqual(['SAME_LOCAL_NAME']);
  });

  it('ignores case, spaces, hyphens and accents in a Latin name', () => {
    for (const spelling of ['Tan Weiming', 'TAN Wei-Ming', 'Tán Wei Ming']) {
      expect(
        possibleMatchReasons(
          person({ employeeNo: 'E100205', fullNameLatin: spelling }),
          person({ employeeNo: 'E100206', fullNameLatin: 'Tan Wei Ming' }),
        ),
      ).toEqual(['SAME_LATIN_NAME']);
    }
  });

  it('compares family and given names apart, and in swapped order', () => {
    expect(
      possibleMatchReasons(
        person({ employeeNo: 'E100207', familyName: 'Tan', givenName: 'Weiming' }),
        person({ employeeNo: 'E100208', familyName: 'Tan', givenName: 'Wei Ming' }),
      ),
    ).toEqual(['SAME_LATIN_NAME']);
    expect(
      possibleMatchReasons(
        person({ employeeNo: 'E100209', fullNameLatin: 'Wei Ming Tan' }),
        person({ employeeNo: 'E100210', fullNameLatin: 'Tan Wei Ming' }),
      ),
    ).toEqual(['SAME_NAME_PARTS']);
    expect(
      possibleMatchReasons(
        person({ employeeNo: 'E100211', familyName: 'Wei Ming', givenName: 'Tan' }),
        person({ employeeNo: 'E100212', familyName: 'Tan', givenName: 'Wei Ming' }),
      ),
    ).toEqual(['SAME_NAME_PARTS']);
  });

  it('flags a shared work email, whatever its case', () => {
    expect(
      possibleMatchReasons(
        person({ employeeNo: 'E100213', workEmail: 'Mei.Hua@orge.example' }),
        person({ employeeNo: 'E100214', workEmail: 'mei.hua@orge.example' }),
      ),
    ).toEqual(['SAME_WORK_EMAIL']);
  });

  it('finds nothing in names that only look close, or in different people', () => {
    expect(
      possibleMatchReasons(
        person({ employeeNo: 'E100215', fullNameLatin: 'Tan Wei Min', fullNameLocal: '陈伟民' }),
        person({ employeeNo: 'E100216', fullNameLatin: 'Tan Wei Ming', fullNameLocal: '陈伟明' }),
      ),
    ).toEqual([]);
    expect(
      possibleMatchReasons(
        person({ employeeNo: 'E100217', fullNameLatin: 'Lee Mei Hua' }),
        person({ employeeNo: 'E100218', fullNameLatin: 'Li Meihua' }),
      ),
    ).toEqual([]);
  });

  it('never calls the same employee number a possible match: it is already a confirmed one', () => {
    expect(
      possibleMatchReasons(
        person({ employeeNo: 'E100219', fullNameLatin: 'Tan Wei Ming' }),
        person({ employeeNo: 'E100219', fullNameLatin: 'Tan Wei Ming' }),
      ),
    ).toEqual([]);
  });
});
