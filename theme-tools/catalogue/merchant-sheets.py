"""Extract merchant PowerPoint evidence for review; never mutate Shopify."""
import argparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from zipfile import ZipFile

NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}


def extract(file):
    slides = []
    with ZipFile(file) as archive:
        names = sorted(
            (name for name in archive.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)),
            key=lambda name: int(re.search(r"slide(\d+)", name)[1]),
        )
        for name in names:
            root = ET.fromstring(archive.read(name))
            texts = [node.text or "" for node in root.findall(".//a:t", NS)]
            tables = []
            contents = []
            for table in root.findall(".//a:tbl", NS):
                rows = [[" ".join(node.text or "" for node in cell.findall(".//a:t", NS)).strip()
                         for cell in row.findall("a:tc", NS)] for row in table.findall("a:tr", NS)]
                tables.append(rows)
                if not rows:
                    continue
                quantity_columns = [index for index, label in enumerate(rows[0]) if label.lower() == "qty"]
                for row in rows[1:]:
                    for index in quantity_columns:
                        if (index and len(row) > index and row[index].isdigit() and row[index - 1]
                                and not re.search(r"\btotal\b", row[index - 1], re.I)):
                            label = row[index - 1]
                            prefix = re.match(r"^(HC|JP)\s*·\s*(.+)$", label)
                            contents.append({"name": prefix[2] if prefix else label,
                                             "sourceLabel": label,
                                             "sourceCategory": prefix[1] if prefix else None,
                                             "quantity": int(row[index])})
            total = sum(item["quantity"] for item in contents)
            declared = re.search(r"One-off purchase\s*·\s*(\d+)\s*(?:items|meals)", " ".join(texts), re.I)
            issues = []
            if declared and int(declared[1]) != total:
                issues.append({"kind": "quantity_conflict", "declared": int(declared[1]), "listed": total})
            for rows in tables:
                if len(rows) != 2:
                    continue
                amounts = {}
                for label, value in zip(rows[0], rows[1]):
                    match = re.fullmatch(r"\$\s*([\d,]+\.\d{2})", value)
                    if match:
                        amounts[label.lower()] = int(Decimal(match[1].replace(",", "")) * 100)
                regular, saving, price = (amounts.get(label) for label in
                                          ("regular menu value", "you save", "purchase price"))
                if None not in (regular, saving, price) and regular - saving != price:
                    issues.append({"kind": "price_arithmetic_conflict", "purchasePriceMinor": price,
                                   "regularLessDisplayedSavingsMinor": regular - saving})
                unit = amounts.get("price per item", amounts.get("price per meal"))
                if price is not None and unit is not None and total:
                    calculated = int((Decimal(price) / total).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
                    if calculated != unit:
                        issues.append({"kind": "unit_price_conflict", "displayedUnitMinor": unit,
                                       "unitMinorForListedQuantity": calculated})
            slides.append({"slide": int(re.search(r"slide(\d+)", name)[1]), "title": texts[0] if texts else "",
                           "text": texts, "tables": tables, "contents": contents, "listedQuantity": total,
                           "issues": issues, "activationApproved": False})
    return {"file": file.name, "sha256": hashlib.sha256(file.read_bytes()).hexdigest(), "slides": slides}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", type=Path)
    args = parser.parse_args()
    print(json.dumps({"purpose": "Read-only merchant evidence; pricing/name conflicts require confirmation",
                      "mutationsPerformed": False, "sources": [extract(file) for file in args.files]}, indent=2))
