export { calcProposal } from "./engine";
export {
  OCCUPANCY_TYPES,
  createEmptyLocation,
  defaultFloaterCover,
  defaultGlobalSections,
  defaultProposalInput,
  defaultTerrorismCover,
  normalizeProposalInput,
  syncSectionsWithLocations,
} from "./types";
export type {
  CoverOption,
  FireCoverOption,
  FloaterCover,
  GlobalSections,
  GlobalSettings,
  LocationInput,
  LocationMoney,
  MoneyCoverOption,
  MoneyCoverToggle,
  OccupancyType,
  PincodeRow,
  ProposalInput,
  ProposalResult,
  RateMasterRow,
  TerrorismCover,
  TerrorismScope,
} from "./types";
export {
  buildPincodeMap,
  computeFireRate,
  formatCurrency,
  generateReferenceNumber,
  lookupEqZone,
  resolveFireCover,
  resolveMoneyCover,
} from "./utils";
