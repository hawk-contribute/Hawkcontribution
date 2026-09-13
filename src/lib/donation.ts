/** Public BSC wallet used as the open donation / future rewards funding address. */
export const DONATION = {
  chainId: 56,
  chainLabel: 'BSC',
  chainName: 'BNB Smart Chain',
  address: '0x8ddDdD6235D07b8F9674D747a67598623De2489a',
  explorerUrl:
    'https://bscscan.com/address/0x8ddDdD6235D07b8F9674D747a67598623De2489a',
} as const

export function shortDonationAddress(chars = 6): string {
  const a = DONATION.address
  return `${a.slice(0, chars + 2)}…${a.slice(-chars)}`
}
