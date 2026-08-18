import numpy as np

def process_frame(rgb_array):
    # rgb_array shape: (120, 160, 3)
    height, width, _ = rgb_array.shape
    
    total_lum = 0
    skin_pixels = 0
    edge_feature_pixels = 0
    total_samples = 0

    # Grayscale conversion
    grayscale = (0.299 * rgb_array[:, :, 0] + 0.587 * rgb_array[:, :, 1] + 0.114 * rgb_array[:, :, 2]).astype(np.uint8)

    for y in range(20, 100, 2):
        for x in range(32, 128, 2):
            r = float(rgb_array[y, x, 0])
            g = float(rgb_array[y, x, 1])
            b = float(rgb_array[y, x, 2])
            total_lum += grayscale[y, x]
            total_samples += 1

            # Skin saturation
            lum_sum = r + g + b + 1.0
            norm_r = r / lum_sum
            norm_g = g / lum_sum
            norm_b = b / lum_sum

            is_skin = (norm_r > 0.36) and (norm_g > 0.28) and (norm_r > norm_g) and (norm_g >= norm_b) and ((r - g) >= 8)
            if is_skin:
                skin_pixels += 1

            # Sobel edge gradient
            gx = abs(int(grayscale[y, x + 1]) - int(grayscale[y, x - 1]))
            gy = abs(int(grayscale[y + 1, x]) - int(grayscale[y - 1, x]))
            if (gx + gy) > 20:
                edge_feature_pixels += 1

    avg_lum = total_lum / total_samples
    skin_ratio = skin_pixels / total_samples
    edge_ratio = edge_feature_pixels / total_samples

    is_darkness = avg_lum < 15
    is_face_present = (not is_darkness) and (skin_ratio >= 0.03) and (edge_ratio >= 0.02)

    return {
        "avg_lum": round(avg_lum, 2),
        "skin_ratio": round(skin_ratio, 4),
        "edge_ratio": round(edge_ratio, 4),
        "face_detected": is_face_present
    }

print("=== 1. Test Frame: Person Sitting In Front of Camera ===")
frame_face = np.full((120, 160, 3), [180, 160, 140], dtype=np.uint8) # Background wall
# Add human face in center (skin tones: R=210, G=140, B=110)
frame_face[30:90, 50:110] = [210, 140, 110]
# Add face features (eyes, nose, mouth lines: R=50, G=30, B=20)
frame_face[45:55, 65:75] = [50, 30, 20]
frame_face[70:75, 70:90] = [120, 40, 40]
res1 = process_frame(frame_face)
print("Face Frame Result:", res1)

print("\n=== 2. Test Frame: Candidate Left Frame (Empty Lit Room / Wooden Desk) ===")
frame_empty = np.full((120, 160, 3), [190, 175, 155], dtype=np.uint8) # Beige wall / light room
# Wooden desk at bottom (R=160, G=110, B=60)
frame_empty[80:120, :] = [160, 110, 60]
res2 = process_frame(frame_empty)
print("Empty Room Result:", res2)

print("\n=== 3. Test Frame: Lens Covered (Darkness) ===")
frame_dark = np.full((120, 160, 3), [8, 8, 8], dtype=np.uint8)
res3 = process_frame(frame_dark)
print("Dark Frame Result:", res3)
