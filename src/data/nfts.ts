import type { NftDefinition } from '../types'
import { NFT_REDEEM_POINTS } from '../types'

/** Collectible NFT rewards (app-side; not on-chain mint) */
export const NFT_CATALOG: NftDefinition[] = [
  {
    id: 'nft-eco-02-guardian',
    image: 'rewards/nft/nft-eco-02-guardian.jpg',
    rarityKey: 'legendary',
    titleKey: 'eco02',
    blurbKey: 'eco02',
    requiredPoints: NFT_REDEEM_POINTS,
  },
  {
    id: 'nft-the-aegis',
    image: 'rewards/nft/nft-the-aegis.jpg',
    rarityKey: 'legendary',
    titleKey: 'aegis',
    blurbKey: 'aegis',
    requiredPoints: NFT_REDEEM_POINTS,
  },
  {
    id: 'nft-hawk-token-space',
    image: 'rewards/nft/nft-hawk-token-space.jpg',
    rarityKey: 'epic',
    titleKey: 'tokenSpace',
    blurbKey: 'tokenSpace',
    requiredPoints: NFT_REDEEM_POINTS,
  },
  {
    id: 'nft-sus-03-cyber',
    image: 'rewards/nft/nft-sus-03-cyber.jpg',
    rarityKey: 'epic',
    titleKey: 'sus03',
    blurbKey: 'sus03',
    requiredPoints: NFT_REDEEM_POINTS,
  },
  {
    id: 'nft-token-grove',
    image: 'rewards/nft/nft-token-grove.jpg',
    rarityKey: 'rare',
    titleKey: 'tokenGrove',
    blurbKey: 'tokenGrove',
    requiredPoints: NFT_REDEEM_POINTS,
  },
  {
    id: 'nft-empire-evolution',
    image: 'rewards/nft/nft-empire-evolution.jpg',
    rarityKey: 'rare',
    titleKey: 'empire',
    blurbKey: 'empire',
    requiredPoints: NFT_REDEEM_POINTS,
  },
]
