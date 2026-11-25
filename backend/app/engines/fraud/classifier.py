from typing import List, Dict, Any, Optional
from backend.app.schemas.common import EngineStatus, EngineMetadata
from backend.app.schemas.fraud import FraudIntelligenceResult, FraudEvidenceItem
from backend.app.schemas.speech import TranscriptSegment
from backend.app.engines.base import BaseEngine
from backend.app.engines.fraud.rules import FRAUD_RULES, FraudRule


class FraudRuleEngine(BaseEngine):
    engine_name = "fraud_rule_baseline"

    def __init__(self, rules: Optional[List[FraudRule]] = None):
        self.rules = rules or FRAUD_RULES
        self._limitations: List[str] = [
            "Rule-based detection identifies explicit patterns; novel or indirect euphemisms may be missed.",
            "Operates independently of voice authenticity: a genuine speaker running a scam produces high fraud indicators.",
        ]

    def availability(self) -> EngineStatus:
        return EngineStatus.AVAILABLE

    def metadata(self) -> EngineMetadata:
        return EngineMetadata(
            engine_name=self.engine_name,
            model_name="RuleBasedFraudDetector",
            version="1.0.0",
            device="cpu",
            details={"rule_count": len(self.rules)},
        )

    def limitations(self) -> List[str]:
        return list(self._limitations)

    def load(self) -> None:
        pass

    def infer(
        self,
        transcript: str,
        segments: Optional[List[TranscriptSegment]] = None,
    ) -> FraudIntelligenceResult:
        if not transcript or not transcript.strip():
            return FraudIntelligenceResult(
                availability=EngineStatus.AVAILABLE,
                model_id=self.engine_name,
                categories=[],
                evidence=[],
                limitations=self.limitations() + ["Transcript was empty or non-speech."],
            )

        detected_categories = set()
        evidence_items: List[FraudEvidenceItem] = []

        for rule in self.rules:
            matched_for_rule = False
            for pattern in rule.patterns:
                for match in pattern.finditer(transcript):
                    matched_for_rule = True
                    detected_categories.add(rule.category)
                    start_pos = max(0, match.start() - 30)
                    end_pos = min(len(transcript), match.end() + 30)
                    excerpt = transcript[start_pos:end_pos].strip()
                    start_time = None
                    end_time = None
                    if segments:
                        matched_text = match.group(0).lower()
                        for seg in segments:
                            if matched_text in seg.text.lower():
                                start_time = seg.start_time
                                end_time = seg.end_time
                                break

                    evidence_items.append(
                        FraudEvidenceItem(
                            category=rule.category,
                            excerpt=f"...{excerpt}...",
                            start_time=start_time,
                            end_time=end_time,
                            severity=rule.severity,
                            rule_id=rule.rule_id,
                            explanation=rule.explanation,
                        )
                    )
                    break
                if matched_for_rule:
                    break

        return FraudIntelligenceResult(
            availability=EngineStatus.AVAILABLE,
            model_id=self.engine_name,
            categories=sorted(list(detected_categories)),
            evidence=evidence_items,
            limitations=self.limitations(),
        )
