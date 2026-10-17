"""Index supplied slide evidence without guessing nutrition values or creating Shopify data."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile

NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'p': 'http://schemas.openxmlformats.org/package/2006/relationships'}

def extract(file):
    records = []
    with ZipFile(file) as archive:
        slides = sorted((n for n in archive.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)),
                        key=lambda n: int(re.search(r'slide(\d+)', n)[1]))
        for slide in slides:
            root = ET.fromstring(archive.read(slide))
            texts = [n.text or '' for n in root.findall('.//a:t', NS)]
            rel_path = str(PurePosixPath(slide).parent / '_rels' / (PurePosixPath(slide).name + '.rels'))
            relations = {}
            if rel_path in archive.namelist():
                relations = {r.attrib['Id']: r.attrib for r in ET.fromstring(archive.read(rel_path))}
            images = []
            for image in root.findall('.//a:blip', NS):
                rel = relations.get(image.attrib.get('{'+NS['r']+'}embed', ''))
                if not rel or rel.get('TargetMode') == 'External':
                    continue
                target = posixpath.normpath(str(PurePosixPath(slide).parent / rel['Target']))
                if not target.startswith('ppt/media/') or target not in archive.namelist():
                    raise ValueError('Unresolved embedded nutrition evidence')
                images.append({'archivePath': target, 'sha256': hashlib.sha256(archive.read(target)).hexdigest()})
            records.append({'slide': int(re.search(r'slide(\d+)', slide)[1]),
                            'sourceText': [t for t in texts if t.strip()], 'images': images,
                            'nutritionValuesTranscribed': False, 'merchantAliasVerified': False,
                            'servingBasisVerified': False, 'publishable': False})
    return {'file': file.name, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'slides': records}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('files', nargs='+', type=Path)
    args = parser.parse_args()
    data = {'version': 'nutrition-source-review-20261015', 'shopifyWritesPerformed': False,
            'warning': 'Slide labels differ from catalogue names. Images contain nutrition values; source serving basis requires confirmation. No inferred aliases or macros.',
            'sources': [extract(file) for file in args.files]}
    data['provisionalMappings'] = [
        {'catalogueName': 'Chilli Con Carne Beef', 'sourceFile': 'FPMFROZENHPLC2026_No_Costs.pptx', 'slide': 3,
         'status': 'USER_APPROVED_PLACEHOLDER', 'nutritionPending': True},
        {'catalogueName': 'Mango Salsa Panko Fish', 'sourceFile': 'Justprotein2026_No_Costs.pptx', 'slide': 9,
         'status': 'USER_APPROVED_PLACEHOLDER', 'nutritionPending': True}]
    data['servingBasisDecision'] = 'Do not assume per-meal values. Preserve source figures; hide 100 servings and0.0g. Jerome to confirm serving basis, weight and servings per container.'
    args.output.write_text(json.dumps(data, indent=2)+'\n')
    print(json.dumps({'decks': len(data['sources']), 'slides': sum(len(s['slides']) for s in data['sources']),
                      'images': sum(len(r['images']) for s in data['sources'] for r in s['slides']), 'mutations': 0}))
