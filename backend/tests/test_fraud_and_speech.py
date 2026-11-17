import pytest
from backend.app.engines.fraud.classifier import FraudRuleEngine
from backend.app.schemas.speech import TranscriptSegment
from backend.app.schemas.common import EngineStatus


def test_fraud_engine_detects_otp_harvesting():
    engine = FraudRuleEngine()
    transcript = "Hello sir, please read me the one-time-password code you just received on your mobile."
    result = engine.infer(transcript)

    assert result.availability == EngineStatus.AVAILABLE
    assert "credential_harvesting" in result.categories
    assert len(result.evidence) >= 1
    assert any(e.severity == "CRITICAL" for e in result.evidence)
    assert any(e.rule_id == "RULE_OTP_HARVESTING" for e in result.evidence)


def test_fraud_engine_detects_urgent_transfer_and_secrecy():
    engine = FraudRuleEngine()
    transcript = (
        "You must transfer funds immediately to this temporary holding account. "
        "Do not tell anyone or discuss this with your family."
    )
    result = engine.infer(transcript)

    assert "urgent_transfer" in result.categories
    assert "secrecy_isolation" in result.categories
    assert len(result.evidence) >= 2


def test_fraud_engine_detects_authority_impersonation():
    engine = FraudRuleEngine()
    transcript = "I am calling from the fraud department investigating fraud on your account."
    result = engine.infer(transcript)

    assert "authority_impersonation" in result.categories
    assert any("fraud department" in e.excerpt.lower() for e in result.evidence)


def test_fraud_engine_benign_speech():
    engine = FraudRuleEngine()
    transcript = "Hi mom, I am heading to the supermarket to buy some groceries for dinner tonight."
    result = engine.infer(transcript)

    assert len(result.categories) == 0
    assert len(result.evidence) == 0
