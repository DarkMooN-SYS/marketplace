export const MEMBERSHIP_THRESHOLDS = [
  { tier: 'Starter', value: 0 },
  { tier: 'Bronze', value: 300 },
  { tier: 'Silver', value: 700 },
  { tier: 'Gold', value: 1500 },
  { tier: 'Diamond', value: 3000 },
] as const;

export type MembershipTier = (typeof MEMBERSHIP_THRESHOLDS)[number]['tier'];

export function getMembershipTier(points: number): MembershipTier {
  let tier: MembershipTier = MEMBERSHIP_THRESHOLDS[0].tier;
  for (const threshold of MEMBERSHIP_THRESHOLDS) {
    if (points >= threshold.value) {
      tier = threshold.tier;
    }
  }
  return tier;
}

export function getNextMilestone(points: number): string {
  const next = MEMBERSHIP_THRESHOLDS.find((threshold) => points < threshold.value);
  if (!next) {
    return 'Та хамгийн дээд түвшинд байна';
  }
  const remaining = next.value - Math.max(points, 0);
  return `${remaining.toLocaleString('en-US')} оноо дутуу`;
}
