import zipfile

zpath = r"C:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard_final.zip"
with zipfile.ZipFile(zpath, 'r') as z:
    for filename in ['lib/integrity/ui/IntegrityWidget.tsx', 'lib/integrity/ui/SecurityTimeline.tsx', 'components/business/hiremind/PipelineView.tsx']:
        if filename in z.namelist():
            print(f"\n=================== {filename} ===================")
            content = z.read(filename).decode('utf-8', errors='ignore')
            print(content[:2500])
