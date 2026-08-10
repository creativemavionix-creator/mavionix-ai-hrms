import json

def get_transcript_around_899(file_path):
    print("Reading transcript around step 899-923:")
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get("step_index")
                if step >= 899 and step <= 923:
                    print(f"\n--- STEP {step} ({data.get('type')}, source={data.get('source')}) ---")
                    if data.get("content"):
                        print("Content:", data.get("content")[:1000])
                    if data.get("thinking"):
                        print("Thinking:", data.get("thinking")[:1000])
                    if data.get("tool_calls"):
                        print("Tool calls:", data.get("tool_calls"))
            except Exception as e:
                pass

get_transcript_around_899(r"C:\Users\Pramod\.gemini\antigravity\brain\88b237f1-ca05-415e-b250-7f48b9733228\.system_generated\logs\transcript_full.jsonl")
