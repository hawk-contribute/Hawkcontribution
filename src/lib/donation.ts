/** Public BSC wallet used as the open donation / future rewards funding address. */
export const DONATION = {
  chainId: 56,
  chainLabel: 'BSC',
  chainName: 'BNB Smart Chain',
  address: '0x8ddDdD6235D07b8F9674D747a67598623De2489a',
  explorerUrl:
    'https://bscscan.com/address/0x8ddDdD6235D07b8F9674D747a67598623De2489a',
  /** Prefer HAWK BEP-20 donations to this wallet. */
  preferredAsset: 'HAWK' as const,
} as const

/** Official HAWK BEP-20 on BSC (user shorthand …0D2D). */
export const HAWK_TOKEN = {
  address: '0xE846D164B88eD2e1209609fea3cf7a3D89D70D2D',
  symbol: 'HAWK',
  /** Confirmed on-chain via decimals(); used as default before live read. */
  decimals: 18,
  explorerUrl:
    'https://bscscan.com/token/0xE846D164B88eD2e1209609fea3cf7a3D89D70D2D',
  /** Common burn sinks tracked for active burn stats. */
  burnSinks: [
    '0x000000000000000000000000000000000000dead',
    '0x0000000000000000000000000000000000000000',
  ] as const,
} as const

export function shortDonationAddress(chars = 6): string {
  const a = DONATION.address
  return `${a.slice(0, chars + 2)}…${a.slice(-chars)}`
}

export function shortHawkToken(chars = 4): string {
  const a = HAWK_TOKEN.address
  return `${a.slice(0, chars + 2)}…${a.slice(-chars)}`
}
