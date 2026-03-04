#!/usr/bin/env python3
"""Model Evaluation Script.

This script evaluates the current models using a provided JSONL
validation file containing inputs and expected ground truth labels.
"""

import sys
import json
import logging
from pathlib import Path

# Add the api module path
API_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(API_DIR))

from ml.face_analyzer import face_analyzer  # noqa: E402
from ml.audio_analyzer import audio_analyzer  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("evaluate_models")


def evaluate_face_model(validation_jsonl: str):
    """Evaluate face emotion model against a validation set."""
    from PIL import Image
    import base64
    import io

    logger.info("Evaluating Face Emotion Model...")
    
    y_true = []
    y_pred = []
    
    with open(validation_jsonl, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            data = json.loads(line)
            expected = data.get("emotion_label")
            image_b64 = data.get("image_base64")
            
            if not expected or not image_b64:
                continue
                
            try:
                # Decode image and analyze
                image_data = base64.b64decode(image_b64)
                img = Image.open(io.BytesIO(image_data))
                result = face_analyzer.analyze(img)
                
                y_true.append(expected)
                # If face not found, mark as 'unknown'
                y_pred.append(result.get("emotion_label") if result.get("success") else "unknown")
                
            except Exception as e:
                logger.error(f"Error processing record: {e}")
                
    if not y_true:
        logger.warning("No valid records found in the validation file.")
        return
        
    _print_metrics(y_true, y_pred, name="Face Emotion")


def evaluate_audio_model(validation_jsonl: str):
    """Evaluate audio model against validation set."""
    logger.info("Evaluating Audio Emotion Model...")
    
    y_true = []
    y_pred = []
    
    with open(validation_jsonl, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            data = json.loads(line)
            expected = data.get("emotion_label")
            audio_path = data.get("audio_path")
            
            if not expected or not audio_path:
                continue
                
            if not Path(audio_path).exists():
                logger.warning(f"Audio file not found: {audio_path}")
                continue
                
            try:
                with open(audio_path, 'rb') as af:
                    content = af.read()
                result = audio_analyzer.analyze(content)
                
                y_true.append(expected)
                y_pred.append(result.get("emotion_label") if result.get("success") else "unknown")
                
            except Exception as e:
                logger.error(f"Error processing audio record: {e}")

    if not y_true:
        logger.warning("No valid records found in the validation file.")
        return
        
    _print_metrics(y_true, y_pred, name="Audio Cry")


def _print_metrics(y_true, y_pred, name: str):
    """Calculate and print simple evaluation metrics (Precision, Recall, Accuracy)."""
    labels = list(set(y_true))
    
    correct = sum(1 for true, pred in zip(y_true, y_pred) if true == pred)
    accuracy = correct / len(y_true)
    
    logger.info(f"\n--- {name} Model Results ---")
    logger.info(f"Total Samples: {len(y_true)}")
    logger.info(f"Overall Accuracy: {accuracy:.2%} ({correct}/{len(y_true)})\n")
    
    print(f"{'Label':<15} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support'}")
    print("-" * 65)
    
    for label in sorted(labels):
        # True Positives
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == label and p == label)
        # False Positives
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != label and p == label)
        # False Negatives
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == label and p != label)
        
        support = sum(1 for t in y_true if t == label)
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        print(f"{label:<15} | {precision:<10.2f} | {recall:<10.2f} | {f1:<10.2f} | {support}")
    print("\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Kynari Model Evaluator")
    parser.add_argument("--face", help="Path to JSONL file for face validation")
    parser.add_argument("--audio", help="Path to JSONL file for audio validation")
    
    args = parser.parse_args()
    
    if not args.face and not args.audio:
        logger.error("Please provide at least one validation file using --face or --audio")
        sys.exit(1)
        
    # We delay loading heavy ML modules to script execution time so the API isn't blocked.
    if args.face:
        evaluate_face_model(args.face)
        
    if args.audio:
        evaluate_audio_model(args.audio)
