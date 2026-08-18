import zipfile

zpath = r"C:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard_final.zip"
with zipfile.ZipFile(zpath, 'r') as z:
    for filename in ['components/business/hiremind/PipelineView.tsx']:
        if filename in z.namelist():
            with open('scratch/pipeline_view_from_final.txt', 'w', encoding='utf-8') as out:
                out.write(z.read(filename).decode('utf-8', errors='ignore'))
            print("Wrote pipeline_view_from_final.txt")
