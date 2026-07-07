import { useEffect, useState } from "react";
import {
  fetchGlobalSettings,
  fetchPincodeMap,
  fetchRateMaster,
} from "../lib/supabase/client";
import type { GlobalSettings, RateMasterRow } from "../lib/calculator";

export function useCalculatorData() {
  const [rateMaster, setRateMaster] = useState<RateMasterRow[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [pincodeMap, setPincodeMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchRateMaster(), fetchGlobalSettings(), fetchPincodeMap()])
      .then(([rates, globalSettings, pincodes]) => {
        setRateMaster(rates);
        setSettings(globalSettings);
        setPincodeMap(pincodes);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { rateMaster, settings, pincodeMap, loading, error, setRateMaster, setSettings };
}
