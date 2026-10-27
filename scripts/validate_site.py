"""Small stdlib-only CI gate, copied to the separate public repository."""
import hashlib
import json
from pathlib import Path
import sys


def validate(site):
    site = site.resolve()
    manifest = json.loads((site / 'static-manifest.json').read_text(encoding='utf-8'))
    version = json.loads((site / 'version.json').read_text(encoding='utf-8'))
    mapping = json.loads((site / 'api/map.json').read_text(encoding='utf-8'))
    expected = {entry['path'] for entry in manifest['files']}
    actual = {file.relative_to(site).as_posix() for file in site.rglob('*') if file.is_file()}
    assert actual == expected | {'static-manifest.json'}, 'missing or extra files'
    assert len(expected) == len(manifest['files']), 'duplicate manifest entries'
    assert {'index.html', 'version.json', '.nojekyll', '_dashboard-core.js'} <= actual, 'required file missing'
    assert version['readOnly'] and not version['exportEnabled'], 'invalid read-only flags'
    assert manifest['contentVersion'] == version['contentVersion'], 'mixed manifest version'
    assert all(mapping[key] == version[key] for key in ('sourceVersion', 'snapshotVersion', 'contentVersion')), 'mixed mapping version'
    total = (site / 'static-manifest.json').stat().st_size
    for entry in manifest['files']:
        file = site / entry['path']
        assert file.resolve().is_relative_to(site) and not file.is_symlink(), 'unsafe path'
        raw = file.read_bytes()
        assert len(raw) == entry['bytes'], 'size mismatch: ' + entry['path']
        assert hashlib.sha256(raw).hexdigest() == entry['sha256'], 'hash mismatch: ' + entry['path']
        assert file.suffix.lower() in {'.html', '.css', '.js', '.json', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', ''}, 'forbidden file type'
        assert not file.name.startswith('.env'), 'environment file is forbidden'
        total += len(raw)
    assert total <= 60_000_000, 'site exceeds 60MB budget'
    if mapping.get('v', 1) >= 2:
        delivery = mapping['delivery']
        for item in delivery['resources'] + list(delivery['assets'].values()):
            assert item['path'] in actual, 'delivery resource missing'
            raw = (site / item['path']).read_bytes()
            assert len(raw) == item['bytes'] and hashlib.sha256(raw).hexdigest() == item['sha256'], 'delivery hash mismatch'
        packs = {item['path']: json.loads((site / item['path']).read_text(encoding='utf-8')) for item in delivery['resources']}
        assert set(packs[delivery['bootstrap']]['gets']) == set(mapping['gets'].values()), 'GET bundle coverage mismatch'
        assert 'metrics' in packs[delivery['bootstrap']], 'metrics missing'
        assert set(delivery['seriesPacks']) == set(mapping['series']), 'series index mismatch'
        expected = {}
        for key, name in delivery['seriesPacks'].items():
            expected.setdefault(name, set()).add(key)
        assert all(name in packs and set(packs[name]['series']) == keys for name, keys in expected.items()), 'series bundle coverage mismatch'
    else:
        for name in mapping['gets'].values():
            assert 'api/gets/' + name + '.json' in actual, 'GET mapping missing file'
        for key in mapping['series']:
            assert 'api/series/' + key + '.json' in actual, 'series mapping missing file'
    print(json.dumps({'status': 'PASS', 'files': len(actual), 'bytes': total, 'contentVersion': version['contentVersion']}))


if __name__ == '__main__':
    validate(Path(sys.argv[1]))
