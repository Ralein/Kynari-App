# ADR-001: Audio Cry Classification Pipeline

**Status:** Accepted  
**Date:** 2026-03-03  
**Decision-makers:** Kynari Technical Strategy Team  

---

## Context

Kynari's primary signal for baby need detection is **cry audio analysis**. The current implementation uses `foduucom/baby-cry-classification` from HuggingFace via the `transformers` pipeline. Research reveals this model reports only **~38.5% accuracy** — far below the 70% MVP target and critically below the 90%+ achievable by modern architectures.

### Current State (What Exists)

| Component | Implementation | Issue |
|-----------|---------------|-------|
| Audio loading | `librosa.load(sr=16000)` | ✅ Solid |
| Feature extraction | None (raw audio to HF pipeline) | ❌ No spectrogram generation |
| Model | `foduucom/baby-cry-classification` | ❌ 38.5% accuracy |
| Categories | hungry, belly_pain, burping, discomfort, tired | ⚠️ Acceptable but mapping is lossy |
| Inference | CPU, native PyTorch via transformers | ⚠️ Slow cold start, heavy deps |

### Research: State of the Art (2024–2026)

| Architecture | Accuracy | Dataset | Source |
|-------------|----------|---------|--------|
| CNN on Mel Spectrogram (AlexNet) | 84.78% | Donate-a-Cry | JEEEMI 2024 |
| CNN-LSTM Hybrid (DeepInfant V2) | 89% | 5 cry types | GitHub/DeepInfant |
| ResNet + Transformer + MFCC | 93% | Multiple | MDPI 2024 |
| CNN-RNN | 94.97% | Dunstan Baby Lang | UI 2024 |
| ResLSTM + MMT features | 95.98% | Donate-a-Cry | NIH 2024 |
| MFCC + Random Forest | 96.39% | Custom | Frontiers 2024 |
| Novel CNN (custom) | 98.33% | 5 cry types | MDPI 2024 |
| Wav2Vec 2.0 + CNN backend | High | Day-long recordings | EDB-Accelerator 2025 |

### Key Datasets

| Dataset | Classes | Size | License |
|---------|---------|------|---------|
| **Donate-a-Cry Corpus** | 5 (hungry, belly_pain, burping, discomfort, tired) | ~450 samples | Public |
| **Dunstan Baby Language** | 5 | ~500 samples | Research |
| **Baby Chillanto** | 3 (normal, deaf, pathologic) | ~1000+ | Academic |
| **ESC-50 (subset)** | Crying vs environment | 50 classes × 40 clips | CC-BY-NC |

---

## Decision

### Replace `foduucom/baby-cry-classification` with a custom MobileNetV3-Small CNN trained on Mel spectrograms.

### Recommended Pipeline

```
Audio Input (3–5s WAV/MP3)
    │
    ▼
librosa.load(sr=16000) ──→ Waveform
    │
    ▼
librosa.feature.melspectrogram(n_mels=128, fmax=8000)
    │
    ▼
librosa.power_to_db() ──→ Log-Mel Spectrogram (128×128 image)
    │
    ▼
Normalize + Resize to (224, 224, 3) via numpy/PIL
    │
    ▼
MobileNetV3-Small (pretrained ImageNet → fine-tuned on cry spectrograms)
    │
    ▼
5-class softmax: [hungry, belly_pain, burping, discomfort, tired]
    │
    ▼
Export to ONNX → Serve via onnxruntime
```

### Library Scoring

| Criteria | librosa | torchaudio | ONNX Runtime | transformers (current) |
|----------|---------|------------|--------------|----------------------|
| **Performance** | 9/10 — fast Mel generation | 8/10 — good but GPU-oriented | 10/10 — 4.6× faster inference | 5/10 — heavy overhead |
| **Bundle Size** | 7/10 — ~30MB | 4/10 — pulls full torch | 9/10 — ~15MB runtime | 3/10 — 500MB+ torch+transformers |
| **TypeScript/Python Quality** | 9/10 — mature Python API | 8/10 | 9/10 — Python + JS bindings | 8/10 |
| **Community Health** | 9/10 — 7k+ stars, active | 9/10 — PyTorch ecosystem | 10/10 — Microsoft-backed | 10/10 — HuggingFace |
| **Risk** | Low — stable API since 2015 | Medium — API changes | Low — industry standard | Low lib, **High model** (38.5% acc) |
| **TOTAL** | **44/50** | **33/50** | **48/50** | **31/50** |

### Why MobileNetV3-Small?

1. **Size:** ~5.4MB (quantized) vs 50MB limit target ✅
2. **Latency:** ~15ms inference on CPU via ONNX ✅ (sub-1-second target)
3. **Transfer learning:** Pretrained on ImageNet, fine-tune last layers on spectrograms
4. **Mobile-ready:** Designed for edge devices, perfect for future ONNX/TensorRT deployment
5. **Proven:** Used in lyqgo/baby_emotion (TensorFlow variant) with SSD + MobileNetV2

### Exit Strategy

If MobileNetV3 underperforms on Kynari's dataset:
1. **Escape hatch 1:** Switch to EfficientNet-B0 (same pipeline, swap model)
2. **Escape hatch 2:** Use Wav2Vec 2.0 embeddings + lightweight classifier (EDB-Accelerator approach)
3. **Escape hatch 3:** Ensemble MobileNetV3 + Random Forest on MFCC features

---

## Consequences

### Positive
- Accuracy jumps from ~38% to target 85%+ with proper training
- Inference time drops from ~2s (transformers pipeline) to ~50ms (ONNX)
- Dependency footprint shrinks: drop `transformers` for audio, use `onnxruntime` instead
- Clear path to mobile/edge deployment via ONNX

### Negative
- Requires training infrastructure and labeled dataset curation
- Adds ONNX export step to model pipeline
- Must maintain training notebook/scripts alongside inference code

### Dependencies to Add
```
onnxruntime>=1.17.0
```

### Dependencies to Remove (from audio path)
```
# transformers — no longer needed for audio classification
# (keep if still used for face ViT pipeline)
```

---

## Action Items for Builder

1. Add `librosa.feature.melspectrogram` preprocessing to `audio_analyzer.py`
2. Train MobileNetV3-Small on Donate-a-Cry + augmented data
3. Export trained model to ONNX format
4. Replace HF pipeline with `onnxruntime.InferenceSession`
5. Add waveform + spectrogram visualization endpoint for frontend
6. Store spectrogram images for feedback learning loop

## Action Items for Designer

1. Design spectrogram preview card component
2. Design waveform visualization using `wavesurfer.js`
3. Design confidence bar showing all 5 cry categories with percentages
4. Design "Was this correct?" feedback button with cry reason selector
