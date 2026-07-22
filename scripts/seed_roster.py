#!/usr/bin/env python3
"""Seed data/properties.json from the timecard properties.yaml.

Usage:
  python scripts/seed_roster.py \
    --yaml /c/Users/williamz3/Desktop/Automation/facilities_automation/modules/timecard_sync/sync/properties.yaml \
    --out  data/properties.json

Canonical property keys come from yaml.safe_load (correctness); each key's
category comes from the nearest preceding "# ── Category ──" header inside the
property_aliases block (comments, so scanned from raw text).
"""
import argparse, json, re, sys
import yaml

CATEGORY_COLORS = {
    'Academic Buildings':      '#4e79a7',
    'Residence Halls':         '#59a14f',
    'Cascade Complex':         '#9c755f',
    'Athletics & Recreation':  '#e15759',
    'Student Services':        '#edc948',
    'Facilities & Operations': '#b07aa1',
    'Campus Areas & Grounds':  '#76b7b2',
    'Student Family Housing':  '#ff9da7',
}
KNOWN_CATEGORIES = set(CATEGORY_COLORS)
DEFAULT_CATEGORY = 'Campus Areas & Grounds'

def slug(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

def scan_categories(text: str) -> dict:
    """canonical name -> category, by nearest preceding '# ── X ──' header,
    scanning ONLY inside the property_aliases: block."""
    out, current = {}, None
    in_block = False
    for line in text.splitlines():
        if re.match(r'^property_aliases:\s*$', line):
            in_block = True; continue
        if in_block and re.match(r'^[A-Za-z_]', line):   # next top-level key ends the block
            break
        if not in_block:
            continue
        m = re.match(r'^\s*#\s*──\s*(.+?)\s*──', line)
        if m:
            name = m.group(1).strip()
            current = name if name in KNOWN_CATEGORIES else None
            continue
        m = re.match(r'^  ([A-Za-z0-9][^:]*):', line)     # 2-space indent = canonical key
        if m:
            out[m.group(1).strip()] = current or DEFAULT_CATEGORY
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--yaml', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()

    with open(args.yaml, encoding='utf-8') as fh:
        text = fh.read()
    data = yaml.safe_load(text) or {}
    canonicals = list((data.get('property_aliases') or {}).keys())
    cat_of = scan_categories(text)

    properties = []
    for name in canonicals:
        category = cat_of.get(name, DEFAULT_CATEGORY)
        properties.append({
            'id': slug(name),
            'name': name,
            'category': category,
            'famis_locations': [name],   # canonical == FAMIS short name (yaml header)
            'defaultColor': CATEGORY_COLORS[category],
            'mapped': False,
        })

    roster = {'categories': list(CATEGORY_COLORS.keys()), 'properties': properties}
    with open(args.out, 'w', encoding='utf-8') as fh:
        json.dump(roster, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    print(f'wrote {len(properties)} properties across '
          f'{len(set(p["category"] for p in properties))} categories -> {args.out}',
          file=sys.stderr)

if __name__ == '__main__':
    main()
