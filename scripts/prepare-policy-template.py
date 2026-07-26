#!/usr/bin/env python3
"""Convert templates/policyreference.docx sample values into docxtemplater placeholders."""

from __future__ import annotations

import re
import shutil
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "templates" / "policyreference.docx"
BACKUP = ROOT / "templates" / "policyreference.sample.docx"
WORK = ROOT / "templates" / "_policy_work"
OUT = ROOT / "templates" / "policyreference.docx"
PUBLIC_OUT = ROOT / "public" / "templates" / "policyreference.docx"

# Register common OOXML namespaces so serialization keeps readable prefixes.
NSMAP = {
  "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
  "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
  "w14": "http://schemas.microsoft.com/office/word/2010/wordml",
  "w15": "http://schemas.microsoft.com/office/word/2012/wordml",
  "w16se": "http://schemas.microsoft.com/office/word/2015/wordml/symex",
  "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
}
for prefix, uri in NSMAP.items():
  ET.register_namespace(prefix, uri)


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
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = text
    return
  nodes[0].text = text
  nodes[0].set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
  for n in nodes[1:]:
    n.text = ""


def replace_exact_paragraph(root: ET.Element, exact: str, new: str) -> int:
  count = 0
  for p in root.iter(f"{W}p"):
    if cell_text(p) == exact:
      set_text(p, new)
      count += 1
  return count


def replace_containing(root: ET.Element, needle: str, new: str) -> int:
  count = 0
  for p in root.iter(f"{W}p"):
    cur = cell_text(p)
    if needle in cur:
      set_text(p, cur.replace(needle, new))
      count += 1
  return count


def main() -> None:
  if not SRC.exists():
    raise SystemExit(f"Missing template: {SRC}")

  if not BACKUP.exists():
    shutil.copy2(SRC, BACKUP)
    print(f"Backed up original to {BACKUP}")
  # Always prepare from the pristine sample backup when available
  source = BACKUP if BACKUP.exists() else SRC

  if WORK.exists():
    shutil.rmtree(WORK)
  WORK.mkdir(parents=True)
  with zipfile.ZipFile(source, "r") as zf:
    zf.extractall(WORK)

  doc_path = WORK / "word" / "document.xml"
  tree = ET.parse(doc_path)
  root = tree.getroot()
  tables = list(root.iter(f"{W}tbl"))

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
  replace_exact_paragraph(root, "M/S ADITI AUTOMOBILES", "{insured_name}")
  replace_exact_paragraph(
    root,
    "C2, SECTOR 10, GAUTAMBUDDH NAGAR, NOIDA. GAUTAM BUDDHA NAGAR",
    "{insured_address}",
  )
  replace_exact_paragraph(root, "201301", "{insured_pincode}")
  replace_exact_paragraph(root, "UTTAR PRADESH", "{insured_state}")

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

  # SI schedule
  rows2 = tables[2].findall(f"{W}tr")

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

  for ti in (5, 6):
    rows = tables[ti].findall(f"{W}tr")
    set_text(rows[0].findall(f"{W}tc")[1], "{premium}")
    set_text(rows[1].findall(f"{W}tc")[1], "{igst}")
    set_text(rows[2].findall(f"{W}tc")[1], "{stamp_duty}")
    set_text(rows[3].findall(f"{W}tc")[1], "{total}")

  # Fix declaration: write XML declaration + keep root attrs
  xml_bytes = ET.tostring(root, encoding="utf-8")
  # ElementTree may drop the original standalone declaration
  if not xml_bytes.startswith(b"<?xml"):
    xml_bytes = b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml_bytes
  doc_path.write_bytes(xml_bytes)

  # Ensure placeholders are not split across runs (docxtemplater requirement)
  raw = doc_path.read_text(encoding="utf-8")
  # Collapse empty <w:t></w:t> siblings left behind is already handled by set_text

  # Quick sanity: count placeholders
  found = sorted(set(re.findall(r"\{[a-z0-9_]+\}", raw)))
  print(f"Placeholders ({len(found)}):", ", ".join(found[:20]), "...")

  footer_path = WORK / "word" / "footer1.xml"
  footer_path.write_text(
    """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
    <w:tblGrid><w:gridCol w:w="7000"/><w:gridCol w:w="4000"/></w:tblGrid>
    <w:tr>
      <w:tc>
        <w:tcPr><w:tcW w:w="7000" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="80"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr>
            <w:t xml:space="preserve">Policy No.: {policy_number}</w:t>
          </w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="right"/><w:spacing w:before="80"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">Page </w:t></w:r>
          <w:r><w:fldChar w:fldCharType="begin"/></w:r>
          <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
          <w:r><w:fldChar w:fldCharType="end"/></w:r>
          <w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve"> of </w:t></w:r>
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
