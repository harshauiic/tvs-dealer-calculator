export { calcProposal } from "./engine";
export {
  OCCUPANCY_TYPES,
  createEmptyLocation,
  defaultGlobalSections,
  defaultProposalInput,
  normalizeProposalInput,
} from "./types";
export type {
  CoverOption,
  FireCoverOption,
  GlobalSections,
  GlobalSettings,
  LocationInput,
  LocationMoney,
  MoneyCoverOption,
  OccupancyType,
  PincodeRow,
  ProposalInput,
  ProposalResult,
  RateMasterRow,
} from "./types";
export {
  buildPincodeMap,
  computeFireRate,
  formatCurrency,
  generateReferenceNumber,
  lookupEqZone,
} from "./utils";
