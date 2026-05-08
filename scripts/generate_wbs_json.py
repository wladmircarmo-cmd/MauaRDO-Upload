import json
from pathlib import Path
import openpyxl

xlsx_path = Path('public/EAP - Cormoran _ rev0 _ 05.05.2026.xlsx')
wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
ws = wb['Data']
rows = list(ws.iter_rows(values_only=True))
headers = [str(h).strip() if h is not None else '' for h in rows[0]]
print('headers:', headers)

try:
    wbs_idx = headers.index('WBS')
    parent_idx = headers.index('Parent_Task_Path')
except ValueError as error:
    raise SystemExit(f'Missing header: {error}')

entries = []
for row in rows[1:]:
    if not row or row[wbs_idx] is None:
        continue
    wbs = str(row[wbs_idx]).strip()
    parent = row[parent_idx]
    entries.append({'wbs': wbs, 'parent_task_path': str(parent).strip() if parent is not None else ''})

output_path = Path('src/data/wbs-generated.json')
output_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'wrote {len(entries)} entries to {output_path}')
