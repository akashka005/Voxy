"""Stage 0 — Anti-spoofing feasibility evaluation script.

Usage (CPU default):
    python scripts/eval_antispoof.py --data_dir /path/to/dataset --output results.json

Usage (CUDA):
    python scripts/eval_antispoof.py --data_dir /path/to/dataset --device cuda --output results.json

This script ONLY runs against a verified checkpoint configured via AASIST_CHECKPOINT_PATH
in your environment. It refuses to invent predictions or report EER without real data.
"""

import os
import sys
import json
import argparse
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="VoxSentinel Stage 0 — Anti-spoofing feasibility evaluation"
    )
    parser.add_argument(
        "--data_dir",
        type=str,
        required=True,
        help="Path to evaluation dataset folder. Expected structure: "
             "data_dir/{bonafide,spoof}/*.wav OR data_dir/*.wav with a label CSV.",
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=os.environ.get("AASIST_CHECKPOINT_PATH", ""),
        help="Path to AASIST checkpoint (.pt). Falls back to AASIST_CHECKPOINT_PATH env var.",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cpu",
        choices=["cpu", "cuda"],
        help="Compute device (default: cpu).",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="eval_results.json",
        help="Output JSON file path for evaluation results.",
    )
    parser.add_argument(
        "--max_files",
        type=int,
        default=100,
        help="Maximum number of files to evaluate (use small subsets first).",
    )
    return parser.parse_args()


def collect_audio_files(data_dir: str, max_files: int):
    """
    Collects (file_path, label) pairs from a dataset directory.
    Looks for subfolders named 'bonafide' and 'spoof', or labels.csv.
    """
    data_path = Path(data_dir)
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset directory not found: {data_dir}")

    files = []

    # Try labelled subfolder structure
    bonafide_dir = data_path / "bonafide"
    spoof_dir = data_path / "spoof"

    if bonafide_dir.exists():
        for f in sorted(bonafide_dir.glob("*.wav"))[:max_files // 2]:
            files.append((str(f), 1))  # 1 = bonafide

    if spoof_dir.exists():
        for f in sorted(spoof_dir.glob("*.wav"))[:max_files // 2]:
            files.append((str(f), 0))  # 0 = spoof

    # Try flat labels.csv structure
    if not files:
        labels_csv = data_path / "labels.csv"
        if labels_csv.exists():
            import csv
            with open(labels_csv) as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    if i >= max_files:
                        break
                    file_path = data_path / row.get("filename", "")
                    label = 1 if row.get("label", "spoof").lower() == "bonafide" else 0
                    if file_path.exists():
                        files.append((str(file_path), label))

    return files


def compute_eer(scores, labels):
    """Computes Equal Error Rate (EER) from bonafide scores and binary labels."""
    import numpy as np
    scores = np.array(scores)
    labels = np.array(labels)

    thresholds = np.linspace(0.0, 1.0, 1000)
    best_eer = 1.0
    best_threshold = 0.5

    for thresh in thresholds:
        preds = (scores >= thresh).astype(int)
        fa = float(np.sum((preds == 1) & (labels == 0))) / max(np.sum(labels == 0), 1)  # FAR
        fr = float(np.sum((preds == 0) & (labels == 1))) / max(np.sum(labels == 1), 1)  # FRR
        eer_candidate = abs(fa - fr)
        if eer_candidate < abs(best_eer - best_eer):
            pass
        # Find point where FAR ≈ FRR
        if abs(fa - fr) < abs(best_eer):
            best_eer = (fa + fr) / 2.0
            best_threshold = thresh

    return best_eer, best_threshold


def main():
    args = parse_args()

    print("=" * 60)
    print("VoxSentinel — Stage 0: Anti-spoofing Feasibility Evaluation")
    print("=" * 60)

    # 1. Verify checkpoint exists before anything else
    if not args.checkpoint:
        print("\n[BLOCKED] AASIST_CHECKPOINT_PATH is not set.")
        print("Set it via --checkpoint or AASIST_CHECKPOINT_PATH environment variable.")
        print("\nStage 0 gate: checkpoint provenance and license must be verified before use.")
        print("Refer to: https://github.com/clovaai/aasist for official weights.")
        sys.exit(1)

    if not os.path.isfile(args.checkpoint):
        print(f"\n[BLOCKED] Checkpoint file not found: {args.checkpoint}")
        print("Verify file path and checkpoint integrity (SHA-256 hash recommended).")
        sys.exit(1)

    print(f"\nCheckpoint     : {args.checkpoint}")
    print(f"Device         : {args.device}")
    print(f"Dataset        : {args.data_dir}")
    print(f"Max files      : {args.max_files}")

    # 2. Collect evaluation files
    try:
        audio_files = collect_audio_files(args.data_dir, args.max_files)
    except FileNotFoundError as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)

    if not audio_files:
        print("\n[BLOCKED] No labeled audio files found in the dataset directory.")
        print("Expected: subdirectories 'bonafide/' and 'spoof/' with .wav files, or labels.csv")
        sys.exit(1)

    print(f"Found          : {len(audio_files)} labeled audio files")

    # 3. Load AASIST engine
    import torch
    from backend.app.engines.authenticity.aasist import AASISTEngine
    from backend.app.schemas.common import EngineStatus

    engine = AASISTEngine(checkpoint_path=args.checkpoint, device=args.device)
    engine.load()

    if engine.availability() != EngineStatus.AVAILABLE:
        print(f"\n[BLOCKED] AASIST engine could not be loaded. Status: {engine.availability()}")
        print("Verify the checkpoint architecture matches the expected AASIST configuration.")
        sys.exit(1)

    print(f"\nEngine loaded: {engine.metadata().model_name} v{engine.metadata().version} on {engine.metadata().device}")

    # 4. Run inference
    from backend.app.audio.decoder import decode_audio_file
    from backend.app.audio.preprocessing import preprocess_audio
    from backend.app.audio.segmentation import create_overlapping_segments

    all_scores = []
    all_labels = []
    errors = []

    for i, (file_path, true_label) in enumerate(audio_files):
        try:
            decoded = decode_audio_file(file_path)
            preprocessed = preprocess_audio(
                decoded.waveform, orig_sr=decoded.sample_rate, target_sr=16000
            )
            segments = create_overlapping_segments(preprocessed, sample_rate=16000)
            result = engine.infer(segments)

            if result.score is not None:
                all_scores.append(result.score)
                all_labels.append(true_label)

            if (i + 1) % 10 == 0:
                print(f"  Processed {i + 1}/{len(audio_files)} files...")

        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    if not all_scores:
        print("\n[BLOCKED] No valid inference results obtained. Cannot report EER.")
        sys.exit(1)

    # 5. Compute EER
    import numpy as np
    eer, eer_threshold = compute_eer(all_scores, all_labels)

    # 6. Output results
    results = {
        "stage": "Stage 0 — Anti-spoofing Feasibility Baseline",
        "checkpoint": args.checkpoint,
        "model": engine.metadata().model_name,
        "model_version": engine.metadata().version,
        "device": str(engine.metadata().device),
        "dataset_dir": args.data_dir,
        "files_evaluated": len(all_scores),
        "files_failed": len(errors),
        "eer": round(eer * 100, 2),  # EER as percentage
        "eer_threshold": round(eer_threshold, 4),
        "score_type": "UNCALIBRATED_HEURISTIC — not calibrated on held-out data",
        "limitations": engine.limitations(),
        "errors": errors[:10],  # Limit to first 10 error details
    }

    print("\n" + "=" * 60)
    print("RESULTS (PRELIMINARY — READ LIMITATIONS)")
    print("=" * 60)
    print(f"Files evaluated : {results['files_evaluated']}")
    print(f"Files failed    : {results['files_failed']}")
    print(f"EER             : {results['eer']:.2f}%  (threshold={results['eer_threshold']:.4f})")
    print(f"\nLimitations:")
    for lim in results["limitations"]:
        print(f"  - {lim}")
    print(f"\nNote: EER computed on {len(all_scores)} samples. Full evaluation requires")
    print("the complete dataset with proper speaker-disjoint splits.")

    with open(args.output, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nFull results saved to: {args.output}")


if __name__ == "__main__":
    main()
