#!/usr/bin/env python3
"""
Build templates/policyreference.docx from the pristine sample.

- Inserts docxtemplater placeholders
- Supports up to 6 location slots (runtime prunes unused columns/rows)
- Normalizes fonts
- Removes garbled/duplicate premium text and builds one clean premium table
- Ensures table cell borders are closed
- Footer: Policy No. left, Page X of Y right
"""

from __future__ import annotations

import re
import shutil
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / "templates" / "policyreference.sample.docx"
SRC_FALLBACK = ROOT / "templates" / "policyreference.docx"
WORK = ROOT / "templates" / "_policy_work"
OUT = ROOT / "templates" / "policyreference.docx"
PUBLIC_OUT = ROOT / "public" / "templates" / "policyreference.docx"

NSMAP = {
  "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
  "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
  "w14": "http://schemas.microsoft.com/office/word/2010/wordml",
  "w15": "http://schemas.microsoft.com/office/word/2012/wordml",
  "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
}
for prefix, uri in NSMAP.items():
  ET.register_namespace(prefix, uri)

BODY_SIZE = "18"  # 9pt
TITLE_SIZE = "22"  # 11pt
HEADER_SIZE = "20"  # 10pt


def cell_text(el: ET.Element) -> str:
  return "".join(t.text or "" for t in el.iter(f"{W}t"))


def set_text(el: ET.Element, text: str) -> None:
  nodes = list(el.iter(f"{W}t"))
  if not nodes:
    p = el.find(f"{W}p")
    if p is None:
      p = ET.SubElement(el, f"{W}p")
    r = ET.SubElement(p, f"{W}r")
    t = ET.SubElement(r, f"{W}t")
    t.set(XML_SPACE, "preserve")
    t.text = text
    return
  nodes[0].text = text
  nodes[0].set(XML_SPACE, "preserve")
  for n in nodes[1:]:
    n.text = ""


def ensure_rpr_size(r: ET.Element, size: str) -> None:
  rpr = r.find(f"{W}rPr")
  if rpr is None:
    rpr = ET.Element(f"{W}rPr")
    r.insert(0, rpr)
  for tag in (f"{W}sz", f"{W}szCs"):
    node = rpr.find(tag)
    if node is None:
      node = ET.SubElement(rpr, tag)
    node.set(f"{W}val", size)
  rfonts = rpr.find(f"{W}rFonts")
  if rfonts is None:
    rfonts = ET.SubElement(rpr, f"{W}rFonts")
  for attr in ("ascii", "hAnsi", "cs", "eastAsia"):
    rfonts.set(f"{W}{attr}", "Calibri")


def normalize_fonts(root: ET.Element) -> None:
  for p in root.iter(f"{W}p"):
    text = cell_text(p).strip().upper()
    size = TITLE_SIZE if (
      "UNITED INDIA" in text
      or "SPECIAL CONTINGENCY POLICY SCHEDULE" in text
    ) else BODY_SIZE
    if text.startswith("SPECIAL CONTINGENCY POLICY POLICY NO"):
      size = HEADER_SIZE
    for r in p.findall(f"{W}r"):
      ensure_rpr_size(r, size)
  for t in root.iter(f"{W}t"):
    parent_r = None
    # walk up to run
  for r in root.iter(f"{W}r"):
    # default any remaining runs
    rpr = r.find(f"{W}rPr")
    if rpr is None or rpr.find(f"{W}sz") is None:
      ensure_rpr_size(r, BODY_SIZE)


def border_el(tag: str, size: str = "8") -> ET.Element:
  el = ET.Element(f"{W}{tag}")
  el.set(f"{W}val", "single")
  el.set(f"{W}sz", size)
  el.set(f"{W}space", "0")
  el.set(f"{W}color", "000000")
  return el


def ensure_closed_borders(tbl: ET.Element) -> None:
  tbl_pr = tbl.find(f"{W}tblPr")
  if tbl_pr is None:
    tbl_pr = ET.Element(f"{W}tblPr")
    tbl.insert(0, tbl_pr)
  borders = tbl_pr.find(f"{W}tblBorders")
  if borders is None:
    borders = ET.SubElement(tbl_pr, f"{W}tblBorders")
  borders.clear()
  for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
    borders.append(border_el(edge))

  for tc in tbl.iter(f"{W}tc"):
    tc_pr = tc.find(f"{W}tcPr")
    if tc_pr is None:
      tc_pr = ET.Element(f"{W}tcPr")
      tc.insert(0, tc_pr)
    tc_borders = tc_pr.find(f"{W}tcBorders")
    if tc_borders is None:
      tc_borders = ET.SubElement(tc_pr, f"{W}tcBorders")
    tc_borders.clear()
    for edge in ("top", "left", "bottom", "right"):
      tc_borders.append(border_el(edge))


def replace_containing(root: ET.Element, needle: str, new: str) -> None:
  for p in root.iter(f"{W}p"):
    cur = cell_text(p)
    if needle in cur:
      set_text(p, cur.replace(needle, new))


def replace_exact(root: ET.Element, exact: str, new: str) -> None:
  for p in root.iter(f"{W}p"):
    if cell_text(p) == exact:
      set_text(p, new)


def make_premium_table() -> ET.Element:
  tbl = ET.Element(f"{W}tbl")
  tbl_pr = ET.SubElement(tbl, f"{W}tblPr")
  tbl_w = ET.SubElement(tbl_pr, f"{W}tblW")
  tbl_w.set(f"{W}w", "4500")
  tbl_w.set(f"{W}type", "dxa")
  grid = ET.SubElement(tbl, f"{W}tblGrid")
  for w in (2200, 2300):
    col = ET.SubElement(grid, f"{W}gridCol")
    col.set(f"{W}w", str(w))

  rows = [
    ("Premium:", "{premium}"),
    ("IGST (18%):", "{igst}"),
    ("Stamp duty:", "{stamp_duty}"),
    ("Total:", "{total}"),
  ]
  for label, value in rows:
    tr = ET.SubElement(tbl, f"{W}tr")
    for idx, (text, width) in enumerate(((label, 2200), (value, 2300))):
      tc = ET.SubElement(tr, f"{W}tc")
      tc_pr = ET.SubElement(tc, f"{W}tcPr")
      tc_w = ET.SubElement(tc_pr, f"{W}tcW")
      tc_w.set(f"{W}w", str(width))
      tc_w.set(f"{W}type", "dxa")
      p = ET.SubElement(tc, f"{W}p")
      r = ET.SubElement(p, f"{W}r")
      ensure_rpr_size(r, BODY_SIZE)
      if idx == 0:
        ET.SubElement(r.find(f"{W}rPr"), f"{W}b")
      t = ET.SubElement(r, f"{W}t")
      t.set(XML_SPACE, "preserve")
      t.text = text
  ensure_closed_borders(tbl)
  return tbl


def main() -> None:
  source = BACKUP if BACKUP.exists() else SRC_FALLBACK
  if not source.exists():
    raise SystemExit(f"Missing source template: {source}")

  if WORK.exists():
    shutil.rmtree(WORK)
  WORK.mkdir(parents=True)
  with zipfile.ZipFile(source, "r") as zf:
    zf.extractall(WORK)

  doc_path = WORK / "word" / "document.xml"
  tree = ET.parse(doc_path)
  root = tree.getroot()
  body = root.find(f"{W}body")
  assert body is not None
  tables = list(root.iter(f"{W}tbl"))

  # Header placeholders
  replace_containing(
    root,
    "SPECIAL CONTINGENCY POLICY POLICY NO.:0131002626P105650719 UIN NO.IRDAN545RP0297V01200708",
    "SPECIAL CONTINGENCY POLICY POLICY NO.:{policy_number} UIN NO.IRDAN545RP0297V01200708",
  )
  replace_containing(
    root,
    "From 00:00 hrs of 23/07/2026 To midnight of 22/07/2027",
    "From {period_from_lower} To {period_to_lower}",
  )
  replace_exact(root, "M/S ADITI AUTOMOBILES", "{insured_name}")
  replace_exact(
    root,
    "C2, SECTOR 10, GAUTAMBUDDH NAGAR, NOIDA. GAUTAM BUDDHA NAGAR",
    "{insured_address}",
  )
  replace_exact(root, "201301", "{insured_pincode}")
  replace_exact(root, "UTTAR PRADESH", "{insured_state}")

  # Meta table
  rows0 = tables[0].findall(f"{W}tr")
  set_text(rows0[0].findall(f"{W}tc")[1], "{policy_number}")
  set_text(rows0[0].findall(f"{W}tc")[3], "{previous_policy_number}")
  set_text(rows0[1].findall(f"{W}tc")[2], "{insured_details}")
  set_text(rows0[2].findall(f"{W}tc")[2], "{period_from}")
  set_text(rows0[2].findall(f"{W}tc")[4], "{period_to}")

  # Risk locations
  rows1 = tables[1].findall(f"{W}tr")
  for i in range(6):
    cells = rows1[i + 2].findall(f"{W}tc")
    set_text(cells[0], f"{{loc_label_{i + 1}}}")
    set_text(cells[1], f"{{loc_address_{i + 1}}}")
    set_text(cells[2], f"{{loc_occupancy_{i + 1}}}")

  # SI schedule — rename Location N(Rs) headers to Location N (no Rs symbol)
  rows2 = tables[2].findall(f"{W}tr")
  header_cells = rows2[0].findall(f"{W}tc")
  for i, cell in enumerate(header_cells[2:8]):
    set_text(cell, f"Location {i + 1}")

  def set_loc_row(row_idx: int, key: str) -> None:
    cells = rows2[row_idx].findall(f"{W}tc")
    for i, cell in enumerate(cells[2:8]):
      set_text(cell, f"{{{key}_{i + 1}}}")

  def set_span_value(row_idx: int, key: str) -> None:
    cells = rows2[row_idx].findall(f"{W}tc")
    set_text(cells[-1], f"{{{key}}}")

  set_loc_row(1, "fire_building")
  set_loc_row(2, "fire_plant")
  set_loc_row(3, "fire_furniture")
  set_loc_row(4, "fire_plate")
  set_loc_row(5, "fire_neon")
  set_loc_row(6, "fire_stocks")
  set_loc_row(7, "fire_total")
  set_span_value(8, "fire_floater")
  set_span_value(9, "terrorism")
  set_loc_row(10, "burglary_si")
  set_loc_row(11, "mbd_si")
  set_loc_row(12, "plate_si")
  set_span_value(13, "neon_section")
  set_span_value(14, "public_liability_si")
  set_span_value(15, "fidelity_employees")
  set_span_value(16, "fidelity_floater")
  set_span_value(17, "fidelity_per_employee")
  set_loc_row(18, "money_annual")
  set_loc_row(19, "money_single")
  set_loc_row(20, "money_safe")
  set_loc_row(21, "money_till")
  set_span_value(22, "money_terrorism")

  # Remove garbled premium paragraph(s) and any old premium tables beyond remarks
  # Keep tables 0-4 (meta, risk, schedule, deductibles, remarks)
  children = list(body)
  table_elems = [c for c in children if c.tag == f"{W}tbl"]
  # Remove tables after index 4 (extra premium tables if present)
  for extra in table_elems[5:]:
    body.remove(extra)

  for child in list(body):
    if child.tag != f"{W}p":
      continue
    text = cell_text(child)
    if "Premium:" in text and "IGST" in text and "Stamp" in text:
      body.remove(child)

  # Insert one clean premium table before declaration paragraph
  premium_tbl = make_premium_table()
  insert_before = None
  for child in list(body):
    if child.tag == f"{W}p" and "aggregate turnover" in cell_text(child):
      insert_before = child
      break
  if insert_before is not None:
    idx = list(body).index(insert_before)
    body.insert(idx, premium_tbl)
    spacer = ET.Element(f"{W}p")
    body.insert(idx + 1, spacer)
  else:
    # before sectPr
    sect = body.find(f"{W}sectPr")
    if sect is not None:
      idx = list(body).index(sect)
      body.insert(idx, premium_tbl)
    else:
      body.append(premium_tbl)

  # Closed borders on all tables
  for tbl in root.iter(f"{W}tbl"):
    ensure_closed_borders(tbl)

  normalize_fonts(root)

  xml_bytes = ET.tostring(root, encoding="utf-8")
  if not xml_bytes.startswith(b"<?xml"):
    xml_bytes = b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml_bytes
  doc_path.write_bytes(xml_bytes)

  raw = doc_path.read_text(encoding="utf-8")
  # Strip any leftover Rs) artifacts in location headers
  raw = raw.replace("(Rs)", "")
  raw = raw.replace("₹", "")
  doc_path.write_text(raw, encoding="utf-8")
  found = sorted(set(re.findall(r"\{[a-z0-9_]+\}", raw)))
  print(f"Placeholders: {len(found)}")

  (WORK / "word" / "footer1.xml").write_text(
    f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="11000" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="666666"/>
        <w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>
        <w:insideH w:val="nil"/><w:insideV w:val="nil"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="7000"/>
      <w:gridCol w:w="4000"/>
    </w:tblGrid>
    <w:tr>
      <w:tc>
        <w:tcPr><w:tcW w:w="7000" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="60"/></w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:b/><w:sz w:val="{BODY_SIZE}"/><w:szCs w:val="{BODY_SIZE}"/>
            </w:rPr>
            <w:t xml:space="preserve">Policy No.: {{policy_number}}</w:t>
          </w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr>
            <w:jc w:val="right"/>
            <w:spacing w:before="60"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:sz w:val="{BODY_SIZE}"/><w:szCs w:val="{BODY_SIZE}"/>
            </w:rPr>
            <w:t xml:space="preserve">Page </w:t>
          </w:r>
          <w:r><w:fldChar w:fldCharType="begin"/></w:r>
          <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
          <w:r><w:fldChar w:fldCharType="end"/></w:r>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:sz w:val="{BODY_SIZE}"/><w:szCs w:val="{BODY_SIZE}"/>
            </w:rPr>
            <w:t xml:space="preserve"> of </w:t>
          </w:r>
          <w:r><w:fldChar w:fldCharType="begin"/></w:r>
          <w:r><w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>
          <w:r><w:fldChar w:fldCharType="end"/></w:r>
        </w:p>
      </w:tc>
    </w:tr>
  </w:tbl>
</w:ftr>
""",
    encoding="utf-8",
  )

  PUBLIC_OUT.parent.mkdir(parents=True, exist_ok=True)
  tmp_zip = ROOT / "templates" / "_policyreference_out.docx"
  if tmp_zip.exists():
    tmp_zip.unlink()
  with zipfile.ZipFile(tmp_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for path in sorted(WORK.rglob("*")):
      if path.is_file():
        zf.write(path, path.relative_to(WORK).as_posix())

  shutil.copy2(tmp_zip, OUT)
  shutil.copy2(tmp_zip, PUBLIC_OUT)
  tmp_zip.unlink()
  shutil.rmtree(WORK)
  print(f"Wrote {OUT}")
  print(f"Wrote {PUBLIC_OUT}")


if __name__ == "__main__":
  main()
