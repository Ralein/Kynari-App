# ADR-002: Face Analysis Module

**Status:** Accepted  
**Date:** 2026-03-03  
**Decision-makers:** Kynari Technical Strategy Team  

---

## Context

Kynari uses baby facial expression as a **secondary signal** to complement cry audio analysis. The current implementation uses MTCNN (face detection) + ViT (`trpakov/vit-face-expression`) for emotion classification.

### Current State

| Component | Implementation | Assessment |
|-----------|---------------|------------|
| Face detection | MTCNN via `facenet-pytorch` | ⚠️ 2016 architecture, 5 landmarks only |
| Emotion classification | ViT `trpakov/vit-face-expression` | ⚠️ Trained on adult faces (FER2013), not infant-optimized |
| Labels | 7-class FER → mapped to Kynari labels | ⚠️ Adult emotion taxonomy ≠ baby needs |
| Inference | CPU, native PyTorch | ⚠️ ~500ms+ per frame |

### Critical Problem: Adult vs Infant Faces

The ViT model is trained on **FER2013** — a dataset of adult facial expressions. Baby faces have fundamentally different proportions, expressions, and muscle development. Key differences:

- Babies lack "disgust" and "fear" as recognizable expressions
- Baby "distress" manifests differently (mouth shape, eye squint, brow furrow)
- A crying baby doesn't map cleanly to adult "sad" — it maps to a **need** (hungry, tired, pain)

### Research: Face Detection Alternatives

| Detector | Landmarks | Accuracy | Speed (CPU) | Size | Year |
|----------|-----------|----------|-------------|------|------|
| **MTCNN** (current) | 5 | ~95% | ~100ms | ~2MB | 2016 |
| **MediaPipe Face Mesh** | 468 | ~99.3% | ~15ms | ~2MB | 2023+ |
| **RetinaFace** | 5 | ~99.4% | ~80ms | ~100MB | 2019 |
| **YOLOv8-Face** | 5 | ~98% | ~20ms | ~6MB | 2023 |
| **BlazeFace (Short Range)** | 6 | ~98.5% | ~5ms | ~100KB | 2019 |

---

## Decision

### Phase 1 (MVP): Replace MTCNN with MediaPipe Face Mesh for detection; keep ViT for emotion but remap output labels to baby-specific needs.

### Phase 2 (Post-MVP): Train a custom infant-specific MLP on MediaPipe landmark geometry features.

### Recommended Pipeline

```
Image/Frame Input
    │
    ▼
MediaPipe Face Mesh (468 landmarks, 3D coordinates)
    │
    ├──→ Geometric Features:
    │       • Mouth openness ratio (landmarks 13/14 distance)
    │       • Eye squint ratio (landmarks 159/145 distance)
    │       • Brow furrow (landmarks 70/63 height delta)
    │       • Lip corner angle
    │       • Face symmetry score
    │
    ├──→ [Phase 1] ViT emotion classifier (existing, remapped)
    │
    └──→ [Phase 2] Custom MLP on landmark features
              Input: 468×3 = 1404 features → FC(256) → FC(64) → 5 classes
              Classes: [crying, calm, distressed, sleepy, engaged]
```

### Library Scoring: Face Detection

| Criteria | MediaPipe | MTCNN (current) | RetinaFace | YOLOv8-Face |
|----------|-----------|-----------------|------------|-------------|
| **Performance** | 10/10 — 15ms, 468 landmarks | 6/10 — 100ms, 5 landmarks | 8/10 — accurate but heavy | 9/10 — fast |
| **Bundle Size** | 9/10 — ~2MB | 8/10 — ~2MB + torch | 4/10 — ~100MB | 7/10 — ~6MB |
| **Python Quality** | 9/10 — google-maintained | 7/10 — community | 7/10 — research code | 8/10 — ultralytics |
| **Community Health** | 10/10 — Google, 28k stars | 6/10 — maintenance mode | 7/10 — periodic updates | 9/10 — very active |
| **Risk** | Low — Google-backed | Medium — aging, no updates | Medium — research project | Low — Ultralytics |
| **TOTAL** | **48/50** | **35/50** | **34/50** | **42/50** |

### Why MediaPipe Face Mesh?

1. **468 landmarks** vs MTCNN's 5 — enables geometric feature extraction for baby-specific analysis
2. **15ms inference** vs MTCNN's 100ms — critical for real-time video
3. **Google-maintained** with active 2024/2025 updates
4. **Mobile/web deployment** — runs in-browser via TensorFlow.js, enabling future client-side inference
5. **No GPU required** — designed for mobile CPU

### Exit Strategy

1. **If MediaPipe fails on infant faces:** Fall back to YOLOv8-Face (ultralytics, well-maintained)
2. **If ViT emotion scores are unreliable for babies:** Use ONLY geometric features from landmarks (mouth openness, eye state) — no emotion model needed
3. **If custom MLP underperforms:** Use ensemble of geometric rules + ViT soft labels

---

## Consequences

### Positive
- 6× faster face detection (15ms vs 100ms)
- Rich landmark data enables baby-specific feature engineering
- Path to browser-side face detection (privacy win — no image upload needed)
- Drops `facenet-pytorch` dependency

### Negative
- MediaPipe Python API differs from MTCNN — requires rewrite of `face_analyzer.py`
- Geometric features require careful feature engineering for infants
- Phase 2 custom MLP needs infant face training data

### Dependencies to Add
```
mediapipe>=0.10.14
```

### Dependencies to Remove
```
facenet-pytorch>=2.5.0  # replaced by MediaPipe
```

---

## Action Items for Builder

1. Replace MTCNN with MediaPipe Face Mesh in `face_analyzer.py`
2. Extract geometric features (mouth openness, eye squint, brow furrow)
3. Remap ViT output labels → baby-relevant labels (Phase 1)
4. Design custom MLP architecture on landmark features (Phase 2)
5. Add face landmark overlay endpoint for frontend visualization

## Action Items for Designer

1. Design face detection overlay showing landmarks on baby photo
2. Design "facial stress indicator" gauge component
3. Design side-by-side view: camera feed + landmark overlay + emotion result
