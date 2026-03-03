# PLAN.md — Kynari Architecture Blueprint

> Living architectural source of truth. Last updated: 2026-03-03.  
> Maintained by: The Researcher (Technical Strategist)

---

## Product Vision

**Kynari** is an AI-powered baby need detection system that analyzes cry audio, baby face, and contextual metadata to predict needs: Hungry, Diaper, Sleepy, Pain, Calm.

**Not** a medical diagnostic tool — probabilistic predictions only.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15)                    │
│                                                                 │
│  Camera Capture ─┐                                              │
│  Mic Recording ──┼──→ Upload ──→ FastAPI Endpoints              │
│  Context Input ──┘       │                                      │
│                          │      ┌─────────────────────┐         │
│  Result Card ◄───────────┼──────│ Need Prediction     │         │
│  Waveform Display        │      │ Confidence Bar      │         │
│  History Timeline        │      │ Feedback Button     │         │
│                          │      └─────────────────────┘         │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     BACKEND (FastAPI + ONNX Runtime)            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐         │
│  │ Audio Module  │  │ Face Module  │  │ Context Module│         │
│  │              │  │              │  │               │         │
│  │ librosa →    │  │ MediaPipe →  │  │ Pydantic →    │         │
│  │ MelSpec →    │  │ 468 landmarks│  │ Time features │         │
│  │ MobileNetV3  │  │ → Geo feats  │  │               │         │
│  │ (ONNX, 5MB)  │  │ (ONNX, 1MB) │  │               │         │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘         │
│         │                 │                   │                 │
│         └────────┬────────┴───────────────────┘                 │
│                  ▼                                              │
│         ┌─────────────────┐                                     │
│         │ Fusion Module   │                                     │
│         │ FC(14→32→16→5)  │                                     │
│         │ ONNX, 0.1MB     │                                     │
│         └────────┬────────┘                                     │
│                  ▼                                              │
│         { prediction, confidence, secondary, all_needs }        │
│                                                                 │
│         Feedback → feedback_corrections table → retrain loop    │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    DATABASE (Neon Postgres)                      │
│                                                                 │
│  children │ emotion_events │ analysis_sessions │ daily_summaries │
│  feedback_corrections │ child_baselines │ weekly_reports         │
│  user_preferences │ audit_logs                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Decisions

| Layer | Technology | ADR |
|-------|-----------|-----|
| **Audio ML** | MobileNetV3-Small on Mel spectrograms + ONNX Runtime | [ADR-001](docs/adr/ADR-001-audio-cry-classification.md) |
| **Face ML** | MediaPipe Face Mesh + geometric features + ONNX | [ADR-002](docs/adr/ADR-002-face-analysis-module.md) |
| **Fusion** | Learned FC layers (14→5) + contextual metadata | [ADR-003](docs/adr/ADR-003-multimodal-fusion-inference.md) |
| **Backend** | FastAPI, Python 3.12+, uv | Existing |
| **Frontend** | Next.js 15, React 19, Tailwind CSS, shadcn/ui | Existing |
| **Database** | Neon Postgres (migrated from Supabase) | Previous ADR |
| **AI Reports** | Anthropic Claude via LangChain | Existing |

---

## Dependency Manifest (Target)

### Backend — Production
```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
psycopg[binary]>=3.2.0
psycopg-pool>=3.2.0
pydantic>=2.10.0
pydantic-settings>=2.6.0
python-jose[cryptography]>=3.3.0
httpx>=0.28.0
stripe>=11.0.0
anthropic>=0.40.0
langchain-core>=0.1.0
langchain-anthropic>=0.1.0
python-multipart>=0.0.6
numpy>=1.24.0
Pillow>=10.0.0

# ML Inference (lightweight)
librosa>=0.10.0
soundfile>=0.12.0
mediapipe>=0.10.14
onnxruntime>=1.17.0
```

### Backend — Training Only (dev)
```
torch>=2.0.0
torchvision>=0.15.0
albumentations>=1.3.0
scikit-learn>=1.3.0
matplotlib>=3.7.0
```

### Remove from Production
```
# transformers — replaced by ONNX for inference
# facenet-pytorch — replaced by MediaPipe
# torch/torchvision — training only, not needed in production
```

---

## Need Taxonomy (5 Classes)

| Label | Audio Signal | Face Signal | Context Signal |
|-------|-------------|-------------|----------------|
| `hungry` | Rhythmic, escalating cry | Mouth rooting | >2hrs since feed |
| `diaper` | Intermittent fussing | Grimace, squirm | >1.5hrs since change |
| `sleepy` | Whimpering, low-pitched | Eye rubbing, yawning | Approaching nap time |
| `pain` | Sharp, high-pitched | Brow furrow, tight eyes | — |
| `calm` | No cry / cooing | Relaxed, smiling | — |

---

## Performance Targets

| Metric | Target | Current | Path to Target |
|--------|--------|---------|----------------|
| Audio accuracy | ≥85% | ~38% | MobileNetV3 + proper training |
| Inference latency | <1s total | ~2-3s | ONNX Runtime (~50ms per module) |
| Model total size | <50MB | ~500MB (torch) | ONNX export (~6MB total) |
| Face detection speed | <50ms | ~100ms | MediaPipe (15ms) |
| Cold start | <5s | ~15s | Drop transformers, use ONNX |

---

## Implementation Phases

### Phase A: Audio Pipeline Upgrade ← Builder Priority 1
1. Add Mel spectrogram generation to `audio_analyzer.py`
2. Train MobileNetV3-Small on Donate-a-Cry + augmented data
3. Export to ONNX, replace HF pipeline inference
4. Validate accuracy ≥ 85% on test set

### Phase B: Face Pipeline Upgrade
1. Replace MTCNN with MediaPipe in `face_analyzer.py`
2. Extract geometric features (mouth, eyes, brow)
3. Remap emotion labels to 5-class need taxonomy
4. (Future) Train custom infant MLP on landmark features

### Phase C: Fusion & Feedback
1. Add context metadata to analysis endpoints
2. Implement learned fusion module
3. Add `feedback_corrections` table + API endpoint
4. Build feedback UI components

### Phase D: Edge Deployment (Future)
1. ONNX → TensorRT for GPU inference
2. WebAssembly build for in-browser inference
3. React Native / Expo integration for mobile

---

## Research Documents

- [Research Summary](docs/research/baby-emotion-detection-research.md)
- [ADR-001: Audio Classification](docs/adr/ADR-001-audio-cry-classification.md)
- [ADR-002: Face Analysis](docs/adr/ADR-002-face-analysis-module.md)  
- [ADR-003: Multimodal Fusion](docs/adr/ADR-003-multimodal-fusion-inference.md)

---

*This document is maintained by the Researcher. The Builder executes from this blueprint.*
