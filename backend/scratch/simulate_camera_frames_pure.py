def process_video_sequence(frames_rgb):
    # frames_rgb is a list of consecutive frames
    prev_frame = None
    results = []

    for frame_idx, frame in enumerate(frames_rgb):
        total_lum = 0
        motion_pixels = 0
        total_samples = 0

        for y in range(15, 70, 2):
            for x in range(40, 120, 2):
                r, g, b = frame[y][x]
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                total_lum += lum
                total_samples += 1

                if prev_frame is not None:
                    prev_r, prev_g, prev_b = prev_frame[y][x]
                    diff = abs(r - prev_r) + abs(g - prev_g) + abs(b - prev_b)
                    if diff > 15: # Active pixel motion
                        motion_pixels += 1

        prev_frame = frame
        avg_lum = total_lum / total_samples
        motion_ratio = motion_pixels / total_samples

        is_darkness = avg_lum < 15
        
        # In frame 0 (first frame), we initialize. In subsequent frames, candidate presence requires active motion!
        if frame_idx == 0:
            is_face_present = not is_darkness
        else:
            is_face_present = (not is_darkness) and (motion_ratio >= 0.008)

        results.append({
            "frame_idx": frame_idx,
            "avg_lum": round(avg_lum, 2),
            "motion_ratio": round(motion_ratio, 4),
            "face_detected": is_face_present
        })

    return results

print("=== 1. Testing Live Candidate (Micro-Movements) ===")
# Candidate breathing/moving head slightly across 3 frames
f1 = [[[190, 175, 155] for _ in range(160)] for _ in range(120)]
for y in range(20, 65):
    for x in range(50, 110): f1[y][x] = [210, 140, 110]

f2 = [row[:] for row in f1]
f2[20][50] = [215, 145, 115] # Head micro-shift
f2[30][60] = [200, 130, 100]
f2[40][70] = [212, 142, 112]

f3 = [row[:] for row in f2]
f3[22][52] = [210, 140, 110]

res_live = process_video_sequence([f1, f2, f3])
for r in res_live: print("Live Frame:", r)

print("\n=== 2. Testing Candidate Leaving (Static Beige Wall) ===")
# Static beige wall across 3 frames
w1 = [[[190, 175, 155] for _ in range(160)] for _ in range(120)]
w2 = [[[190, 175, 155] for _ in range(160)] for _ in range(120)]
w3 = [[[190, 175, 155] for _ in range(160)] for _ in range(120)]

res_empty = process_video_sequence([w1, w2, w3])
for r in res_empty: print("Empty Wall Frame:", r)
