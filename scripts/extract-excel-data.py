#!/usr/bin/env python3
"""Extract rate tables, pincodes, and test fixtures from the TVSM Excel calculator."""

import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

XLSM_PATH = Path("/Users/naveena-9071/Downloads/TVSM dealers working - multi location - Copy.xlsm")
OUT_DIR = Path(__file__).resolve().parent.parent / "seed"
FIXTURE_DIR = Path(__file__).resolve().parent.parent / "src" / "lib" / "calculator" / "__fixtures__"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def load_shared_strings(z):
    ss = []
    sst = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in sst.findall("m:si", NS):
        texts = []
        for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"):
            if t.text:
                texts.append(t.text)
        ss.append("".join(texts))
    return ss


def cell_value(cell, ss):
    t = cell.get("t")
    v = cell.find("m:v", NS)
    if v is None:
        return None
    val = v.text or ""
    if t == "s":
        return ss[int(val)]
    if t == "b":
        return val == "1"
    try:
        if "." in val:
            return float(val)
        return int(val)
    except ValueError:
        return val


def sheet_rows(z, sheet_path, ss):
    root = ET.fromstring(z.read(sheet_path))
    rows = {}
    for row in root.findall(".//m:sheetData/m:row", NS):
        rnum = int(row.get("r"))
        rows[rnum] = {}
        for c in row.findall("m:c", NS):
            ref = c.get("r", "")
            col = "".join(ch for ch in ref if ch.isalpha())
            rows[rnum][col] = cell_value(c, ss)
    return rows


def extract_rate_master(sheet1_rows):
    rates = []
    for r in range(2, 22):
        row = sheet1_rows.get(r, {})
        if not row.get("A"):
            continue
        iib = float(row.get("C", 0))
        eq = float(row.get("D", 0))
        stfi = float(row.get("E", 0))
        terror = float(row.get("F", 0))
        disc_u5 = float(row.get("G", 70))
        disc_iib = float(row.get("H", 100))
        disc_eq = float(row.get("I", 0))
        disc_stfi = float(row.get("J", 0))
        rate_u5_wo = (iib + eq + stfi) * (1 - disc_u5 / 100)
        rate_o5_wo = (iib * (1 - disc_iib / 100)) + (eq * (1 - disc_eq / 100)) + (stfi * (1 - disc_stfi / 100))
        rates.append({
            "occupancy": row["A"].strip(),
            "eq_zone": int(row["B"]),
            "iib_rate": iib,
            "eq_rate": eq,
            "stfi_rate": stfi,
            "terrorism_rate": terror,
            "discount_under_5cr": disc_u5,
            "discount_iib_over_5cr": disc_iib,
            "discount_eq_over_5cr": disc_eq,
            "discount_stfi_over_5cr": disc_stfi,
            "rate_under_5cr_without_terror": round(rate_u5_wo, 6),
            "rate_over_5cr_without_terror": round(rate_o5_wo, 6),
            "rate_under_5cr_with_terror": round(rate_u5_wo + terror, 6),
            "rate_over_5cr_with_terror": round(rate_o5_wo + terror, 6),
        })
    return rates


def extract_pincodes(sheet2_rows):
    pincodes = []
    for r in range(2, max(sheet2_rows.keys()) + 1):
        row = sheet2_rows.get(r, {})
        pin = row.get("A")
        zone = row.get("B")
        if pin is None or zone is None:
            continue
        pincodes.append({"pincode": str(int(pin)), "eq_zone": int(zone)})
    return pincodes


def extract_global_settings(sheet2_rows):
    return {
        "sookshama_discount_pct": float(sheet2_rows.get(1, {}).get("F", 70)),
        "iib_discount_pct": float(sheet2_rows.get(2, {}).get("F", 100)),
        "burglary_rate_pct": 0.005,
        "mbd_rate_per_thousand": 0.25,
        "plate_glass_rate_pct": 0.03,
        "neon_sign_rate_pct": 0.03,
        "public_liability_rate_pct": 0.03,
        "fidelity_rate_pct": 0.1,
        "money_without_terror_rate_pct": 0.01,
        "money_with_terror_rate_pct": 0.031,
        "gst_rate_pct": 18,
        "si_threshold": 50_000_000,
        "floater_si_cap": 500_000_000,
        "max_location_si": 500_000_000,
    }


def extract_aditi_fixture(proposal_rows):
    location_blocks = [
        {"start": 13, "building_row": 27, "fire_cover_row": 24, "loc_num": 1},
        {"start": 34, "building_row": 47, "fire_cover_row": 45, "loc_num": 2},
        {"start": 54, "building_row": 67, "fire_cover_row": 65, "loc_num": 3},
        {"start": 74, "building_row": 87, "fire_cover_row": 85, "loc_num": 4},
        {"start": 94, "building_row": 107, "fire_cover_row": 105, "loc_num": 5},
    ]

    def safe_float(val, default=0.0):
        try:
            return float(val) if val not in (None, "", "Sum Insured") else default
        except (TypeError, ValueError):
            return default

    def loc(block):
        s = block["start"]
        b = block["building_row"]
        return {
            "location_number": block["loc_num"],
            "dealer_code": proposal_rows.get(s + 1, {}).get("B", ""),
            "address": proposal_rows.get(s + 2, {}).get("B", ""),
            "pincode": str(proposal_rows.get(s + 4, {}).get("B", "")),
            "eq_zone": proposal_rows.get(s + 5, {}).get("B"),
            "occupancy": proposal_rows.get(s + 6, {}).get("B", ""),
            "insurance_company": proposal_rows.get(s + 9, {}).get("B", ""),
            "period_of_cover": proposal_rows.get(s + 10, {}).get("B", ""),
            "claims_history": proposal_rows.get(s + 11, {}).get("B", ""),
            "fire_cover": proposal_rows.get(block["fire_cover_row"], {}).get("C", ""),
            "building_si": safe_float(proposal_rows.get(b, {}).get("B")),
            "plant_machinery_si": safe_float(proposal_rows.get(b + 1, {}).get("B")),
            "furniture_si": safe_float(proposal_rows.get(b + 2, {}).get("B")),
            "plate_glass_si": safe_float(proposal_rows.get(b + 3, {}).get("B")),
            "neon_sign_si": safe_float(proposal_rows.get(b + 4, {}).get("B")),
            "stocks_si": safe_float(proposal_rows.get(b + 5, {}).get("B")),
            "fire_premium": safe_float(proposal_rows.get(b, {}).get("C")),
        }

    return {
        "insured_name": proposal_rows.get(9, {}).get("B", ""),
        "communication_address": proposal_rows.get(10, {}).get("B", ""),
        "stock_floater": proposal_rows.get(25, {}).get("C", ""),
        "locations": [loc(b) for b in location_blocks],
        "global_sections": {
            "burglary": proposal_rows.get(114, {}).get("C", ""),
            "mbd_eei": proposal_rows.get(122, {}).get("C", ""),
            "plate_glass": proposal_rows.get(126, {}).get("C", ""),
            "neon_sign": proposal_rows.get(130, {}).get("C", ""),
            "public_liability": proposal_rows.get(134, {}).get("C", ""),
            "fidelity": proposal_rows.get(137, {}).get("C", ""),
        },
        "money_global": {
            "cover": proposal_rows.get(142, {}).get("C", ""),
            "annual_carrying_limit": float(proposal_rows.get(144, {}).get("B") or 0),
            "single_carrying_limit": float(proposal_rows.get(145, {}).get("B") or 0),
            "cash_in_safe": float(proposal_rows.get(146, {}).get("B") or 0),
            "cash_in_till": float(proposal_rows.get(147, {}).get("B") or 0),
            "premium": float(proposal_rows.get(144, {}).get("C") or 0),
        },
        "expected": {
            "net_premium": float(proposal_rows.get(150, {}).get("C") or 0),
            "gst": float(proposal_rows.get(151, {}).get("C") or 0),
            "total_premium": float(proposal_rows.get(152, {}).get("C") or 0),
            "burglary_premium": float(proposal_rows.get(116, {}).get("C") or 0),
            "mbd_premium": float(proposal_rows.get(124, {}).get("C") or 0),
            "plate_glass_premium": float(proposal_rows.get(128, {}).get("C") or 0),
        },
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(XLSM_PATH, "r") as z:
        ss = load_shared_strings(z)
        sheet1 = sheet_rows(z, "xl/worksheets/sheet3.xml", ss)
        sheet2 = sheet_rows(z, "xl/worksheets/sheet2.xml", ss)
        proposal = sheet_rows(z, "xl/worksheets/sheet1.xml", ss)

    rate_master = extract_rate_master(sheet1)
    pincodes = extract_pincodes(sheet2)
    global_settings = extract_global_settings(sheet2)
    fixture = extract_aditi_fixture(proposal)

    (OUT_DIR / "rate_master.json").write_text(json.dumps(rate_master, indent=2))
    (OUT_DIR / "global_settings.json").write_text(json.dumps(global_settings, indent=2))
    (OUT_DIR / "pincodes.json").write_text(json.dumps(pincodes))
    (FIXTURE_DIR / "aditi-automobiles.json").write_text(json.dumps(fixture, indent=2))

    # Also write CSV for Supabase bulk import
    with open(OUT_DIR / "pincodes.csv", "w") as f:
        f.write("pincode,eq_zone\n")
        for p in pincodes:
            f.write(f"{p['pincode']},{p['eq_zone']}\n")

    print(f"Extracted {len(rate_master)} rate rows")
    print(f"Extracted {len(pincodes)} pincodes")
    print(f"Expected net premium: {fixture['expected']['net_premium']}")
    print(f"Output: {OUT_DIR}")


if __name__ == "__main__":
    main()
