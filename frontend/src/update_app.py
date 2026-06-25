import os

app_path = r'd:\git\text-to-speed-internal\frontend\src\App.jsx'
with open(app_path, 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

cut_idx = -1
for i, line in enumerate(lines):
    if line.startswith('// ────'):
        cut_idx = i
        break

if cut_idx != -1:
    new_lines = lines[:cut_idx]
    new_lines.append('export default App')
    
    imports_to_add = [
        "import AuthScreen from './pages/AuthScreen'",
        "import Dashboard from './pages/Dashboard'",
        "import CreateAudio from './pages/CreateAudio'",
        "import BatchConvert from './pages/BatchConvert'",
        "import Voices from './pages/Voices'",
        "import AudioLibrary from './pages/AudioLibrary'",
        "import Billing from './pages/Billing'",
        "import Profile from './pages/Profile'"
    ]
    
    insert_idx = 0
    for i, line in enumerate(new_lines):
        if 'import { API_BASE_URL }' in line:
            insert_idx = i + 1
            break
            
    new_lines = new_lines[:insert_idx] + imports_to_add + new_lines[insert_idx:]
    
    with open(app_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))
    print('Successfully extracted and updated App.jsx')
else:
    print('Separator not found')
