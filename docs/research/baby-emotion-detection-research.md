# Research Summary: Baby Emotion / Need Detection — State of the Art (March 2026)

## Executive Summary

Kynari's current ML pipeline has a **critical accuracy gap** in its audio module and an **architecture mismatch** in its face module. This research identifies concrete replacements that bring the system from prototype to production quality.

| Module | Current | Proposed | Impact |
|--------|---------|----------|--------|
| Audio classification | foduucom HF model (38.5% acc) | MobileNetV3 on Mel spectrograms | **+50% accuracy** |
| Face detection | MTCNN (100ms, 5 landmarks) | MediaPipe Face Mesh (15ms, 468 landmarks) | **6× faster** |
| Emotion taxonomy | 7 adult emotions | 5 baby needs | **Product-aligned** |
| Inference runtime | PyTorch + transformers (~500MB) | ONNX Runtime (~15MB) | **4.6× faster, 30× lighter** |
| Fusion | Hardcoded 60/40 weights | Learned FC layers + context metadata | **Adaptive** |
| Feedback | None | Correction-driven fine-tuning | **Personalization** |

## GitHub Repos Studied

| Repository | Architecture | Key Insight for Kynari |
|-----------|-------------|----------------------|
| **lyqgo/baby_emotion** | TF + SSD + MobileNetV2 | Validates MobileNet family for baby face detection |
| **DeepInfant V2** | CNN-LSTM hybrid | 89% accuracy with Mel spectrograms — hybrid arch worth exploring |
| **EDB-Accelerator/Infant-Crying-Detection** | Wav2Vec 2.0 + CNN/SVM | State-of-art embeddings for day-long recordings |
| **martha92/babycry** | CNN/RNN/Attention | 8-category classification, data augmentation techniques |
| **CryBell** | ML + signal processing | Emotion state classification approach |
| **wan9wu/BANBAN** | OpenCV + CNN/Keras | Real-time emotion tracking via webcam |
| **GolamMullick/Infant_FacialExpression** | VGGNet CNN | Infant-specific facial expression dataset |
| **giulbia/baby_cry_detection** | ML on RPi | Edge deployment patterns |

## Benchmarks Referenced

- CNN on Mel spectrogram: **84–98%** accuracy (multiple 2024 studies)
- Wav2Vec 2.0 embeddings: **high accuracy** on extended recordings
- MFCC + Random Forest: **96.39%** (fastest to implement)
- ONNX inference: **4.6×** faster than PyTorch native
- MediaPipe vs MTCNN: **99.3% vs ~95%** detection accuracy

## Recommended Tech Stack (Final)

```
AUDIO PIPELINE:
  librosa 0.10+          → Mel spectrogram generation
  torch 2.0+             → Training only (not inference)
  onnxruntime 1.17+      → Production inference
  MobileNetV3-Small      → CNN classifier (~5MB ONNX)

FACE PIPELINE:
  mediapipe 0.10+        → Face mesh (468 landmarks)
  numpy                  → Geometric feature extraction
  Custom MLP             → Infant stress classifier (~1MB ONNX)

FUSION:
  onnxruntime            → All inference through ONNX
  Custom FC layers       → Learned multimodal fusion (~0.1MB)

TRAINING (offline):
  torch + torchvision    → Model training
  donate-a-cry corpus    → Primary dataset
  albumentations         → Spectrogram augmentation
```

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Donate-a-Cry dataset too small (~450 samples) | High | Medium | Data augmentation (pitch shift, noise, time stretch) |
| MediaPipe fails on very young infants (<1mo) | Medium | Medium | Fall back to YOLOv8-Face |
| MobileNetV3 underfits on spectrograms | Low | High | Switch to EfficientNet-B0 or Wav2Vec |
| ONNX export breaks with model changes | Low | Low | Keep PyTorch fallback path |
| Parents don't provide enough feedback | High | Low | Use aggregate anonymized feedback |

---

*Research conducted 2026-03-03. See ADR-001, ADR-002, ADR-003 for detailed decisions.*
