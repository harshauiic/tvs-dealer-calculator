import {
  calcProposal,
  normalizeProposalInput,
  type GlobalSettings,
  type ProposalInput,
  type ProposalResult,
  type RateMasterRow,
} from "../calculator";
import { loadProposal } from "../supabase/client";

export async function resolveProposalForExport(
  referenceNumber: string,
  rateMaster: RateMasterRow[],
  settings: GlobalSettings,
  pincodeMap: Map<string, number>,
): Promise<{ input: ProposalInput; result: ProposalResult; reference: string }> {
  const data = await loadProposal(referenceNumber);
  if (!data) throw new Error("Proposal not found");

  const payload = (data.payload ?? data) as {
    input?: ProposalInput;
    result?: ProposalResult;
  };
  if (!payload.input) throw new Error("Proposal payload is incomplete");

  const input = normalizeProposalInput(payload.input);
  const result = calcProposal(input, rateMaster, pincodeMap, settings);
  return { input, result, reference: referenceNumber };
}
