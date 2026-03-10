# ADR-003: Multimodal Fusion & Inference Architecture

**Status:** Accepted  
**Date:** 2026-03-03  
**Decision-makers:** Kynari Technical Strategy Team  

---

## Context

Kynari combines **audio cry analysis** (primary) + **face analysis** (secondary) + **contextual metadata** to predict baby needs. The current multimodal fusion uses a simple weighted average (face 60%, audio 40%) with hardcoded thresholds.

### Current State

| Component | Implementation | Issue |
|-----------|---------------|-------|
| Fusion method | Hardcoded 60/40 weight | ❌ No learning, no context |
| Threshold | `face_confidence > 0.7` gates primary | ❌ Arbitrary, not data-driven |
| Metadata | None used | ❌ Missing time-since-feed, diaper, sleep context |
| Output labels | 7 emotions (adult taxonomy) | ⚠️ Should be 5 needs (hungry, diaper, sleepy, pain, calm) |
| Feedback loop | None | ❌ No personalization |

### Master Requirements


```json
{
  "prediction": "Hungry",
  "confidence": 0.67,
  "secondary": "Sleepy"
}
```

With 5 need classes: **Hungry, Diaper, Sleepy, Pain/Discomfort, Calm**

---

## Decision

### Implement a 3-stage fusion architecture with ONNX-based inference.

### Architecture

```
┌─────────────────────┐   ┌──────────────────────┐   ┌────────────────────┐
│  AUDIO MODULE       │   │  FACE MODULE         │   │  CONTEXT MODULE    │
│  (ADR-001)          │   │  (ADR-002)           │   │                    │
│                     │   │                      │   │  • mins_since_feed │
│  Mel Spectrogram    │   │  MediaPipe Mesh      │   │  • mins_since_nap  │
│  → MobileNetV3     │   │  → Geometric Feats   │   │  • diaper_age_mins │
│  → 5-class probs   │   │  → Stress features   │   │  • time_of_day     │
│                     │   │                      │   │  • baby_age_months │
│  Output: [5 floats] │   │  Output: [4 floats]  │   │  Output: [5 floats]│
└────────┬────────────┘   └──────────┬───────────┘   └─────────┬──────────┘
         │                           │                          │
         └───────────────┬───────────┴──────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  FUSION MODULE       │
              │                      │
              │  Concatenate: 14 dim │
              │  → FC(32) + ReLU     │
              │  → FC(16) + ReLU     │
              │  → FC(5) + Softmax   │
              │                      │
              │  Output:             │
              │  {                   │
              │    prediction: str,  │
              │    confidence: float,│
              │    secondary: str,   │
              │    all_needs: {}     │
              │  }                   │
              └──────────────────────┘
```

### Unified Label Taxonomy

| Need Label | Audio Cry Reason | Face Signal | Context Signal |
|-----------|-----------------|-------------|----------------|
| **hungry** | hungry cry pattern | mouth rooting, fussing | > 2hrs since feed |
| **diaper** | discomfort cry | face squirm, grimace | > 1.5hrs since change |
| **sleepy** | tired/whimpering cry | eye rubbing, yawning | approaching nap time |
| **pain** | high-pitched sharp cry | brow furrow, tight eyes | — |
| **calm** | no cry / cooing | relaxed, smiling | — |

### Inference Deployment Strategy

| Option | Latency | Cold Start | Cost | Scaling |
|--------|---------|------------|------|---------|
| **FastAPI + ONNX Runtime (recommended)** | ~50ms | ~2s | Low | Vertical |
| Modal.com serverless | ~100ms | ~5s | Pay-per-use | Auto |
| AWS Lambda + ONNX | ~80ms | ~8s | Pay-per-use | Auto |
| Replicate | ~200ms | ~10s | Pay-per-use | Auto |

**Recommendation:** FastAPI + ONNX Runtime on the existing API server for MVP. Migrate to Modal.com if scaling demands exceed a single server.

### ONNX Export Strategy

```python
# Export trained PyTorch model to ONNX
torch.onnx.export(
    model,
    dummy_input,
    "kynari_cry_classifier.onnx",
    opset_version=17,
    input_names=["mel_spectrogram"],
    output_names=["need_probabilities"],
    dynamic_axes={"mel_spectrogram": {0: "batch_size"}},
)
```

All three modules (audio CNN, face MLP, fusion FC) export to separate ONNX files:
- `kynari_audio.onnx` (~5MB)
- `kynari_face.onnx` (~1MB)  
- `kynari_fusion.onnx` (~0.1MB)
- **Total: ~6MB** (well under 50MB target)

### Feedback Learning System

```
Parent taps "Was this correct?"
    │
    ├── Yes → Store (audio_hash, predicted_label, confirmed=true)
    │
    └── No → Show picker: [Hungry, Diaper, Sleepy, Pain, Calm]
              │
              └── Store (audio_hash, corrected_label, spectrogram_path)
                     │
                     ▼
              Accumulate corrections → Retrain pipeline (weekly batch)
              Fine-tune per-baby model after 50+ corrections
```

### Schema Addition Required

```sql
CREATE TABLE IF NOT EXISTS feedback_corrections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    session_id      UUID REFERENCES analysis_sessions(id),
    predicted_label TEXT NOT NULL,
    corrected_label TEXT,
    confirmed       BOOLEAN DEFAULT false,
    spectrogram_url TEXT,
    audio_hash      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_child ON feedback_corrections(child_id, created_at);
```

### Exit Strategy

1. **If fusion MLP underperforms:** Fall back to weighted average with learned weights (simpler)
2. **If ONNX export breaks:** Serve PyTorch models directly (slower but functional)
3. **If Modal/serverless needed:** All ONNX models are portable — deploy anywhere

---

## Consequences

### Positive
- Unified 5-class need taxonomy matches product requirements
- Contextual metadata improves accuracy (time-since-feed is the #1 predictor parents use)
- Total model footprint ~6MB — mobile/edge ready
- Feedback loop enables per-baby personalization over time
- ONNX portability means no vendor lock-in

### Negative
- Fusion module requires training data with all three modalities aligned
- Context metadata requires frontend UI for last-feed/last-diaper input
- Feedback corrections table adds storage growth

---

## Action Items for Builder

1. Create unified `NeedPrediction` Pydantic model with the 5-class taxonomy
2. Add context metadata input to analysis endpoints
3. Implement fusion module (start with weighted average, evolve to learned FC)
4. Add `feedback_corrections` table migration
5. Create `/api/feedback` endpoint for parent corrections
6. Add ONNX export scripts in `packages/api/scripts/`

## Action Items for Designer

1. Design context input UI: "When did baby last eat/sleep/diaper change?"
2. Design the unified need result card showing prediction + confidence + secondary
3. Design the "Was this correct?" feedback flow with need picker
4. Design the history timeline showing prediction accuracy over time
