const rules: [string, RegExp][] = [
  ['work_authorization', /work authorization|authorized to work|legally eligible to work|right to work/i],
  ['requires_sponsorship', /sponsor(ship)?|visa support|immigration support/i],
  [
    'salary_expectation',
    /salary expectation|desired\s+(?:annual\s+|monthly\s+|base\s+)?salary|salary requirement|compensation expectation|pay expectation/i,
  ],
  ['notice_period', /notice period|availability to start|available to start|when can you start/i],
  ['relocation', /willing to relocate|relocation/i],
  ['linkedin_url', /linkedin/i],
  ['website_url', /personal website|portfolio|website url|website link/i],
  [
    'referral_source',
    /how did you hear|where did you hear|what channel|through what channel|found this job opening|referred by|source of application/i,
  ],
  ['eeo_gender', /gender/i],
  ['eeo_race_ethnicity', /race|ethnicity/i],
  ['eeo_veteran_status', /veteran status|protected veteran/i],
  ['eeo_disability_status', /disability status|disability self|disabled/i],
];

export function canonicalKey(label: string): string | null {
  return rules.find(([, pattern]) => pattern.test(label))?.[0] ?? null;
}
