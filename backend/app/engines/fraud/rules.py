import re
from dataclasses import dataclass
from typing import List, Pattern


@dataclass
class FraudRule:
    rule_id: str
    category: str
    patterns: List[Pattern]
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    explanation: str


FRAUD_RULES: List[FraudRule] = [
    # 1. Credential & OTP harvesting
    FraudRule(
        rule_id="RULE_OTP_HARVESTING",
        category="credential_harvesting",
        patterns=[
            re.compile(r"\b(one[\s\-]time[\s\-]password|otp|verification\s+code|security\s+code|2fa\s+code)\b", re.IGNORECASE),
            re.compile(r"\b(read|tell|give|send|share)\s+(me\s+)?(the\s+)?(code|otp|digits?|password|pin)\b", re.IGNORECASE),
            re.compile(r"\b(password|pin\s+number|cvv|cvc|card\s+expiry)\b", re.IGNORECASE),
        ],
        severity="CRITICAL",
        explanation="Attempting to harvest sensitive credentials, one-time passwords (OTP), or payment PINs.",
    ),
    # 2. Urgent Financial Transfers
    FraudRule(
        rule_id="RULE_URGENT_TRANSFER",
        category="urgent_transfer",
        patterns=[
            re.compile(r"\b(transfer|wire|send)\s+(money|funds|cash|amount|dollars?|rupees?|crypto|bitcoin)\s+(immediately|now|urgently|right\s+away)\b", re.IGNORECASE),
            re.compile(r"\b(buy|purchase)\s+(gift\s+cards?|apple\s+cards?|google\s+play\s+cards?)\b", re.IGNORECASE),
            re.compile(r"\b(safe|temporary|holding)\s+account\b", re.IGNORECASE),
        ],
        severity="HIGH",
        explanation="Demanding immediate wire transfers, cryptocurrency deposits, or gift card purchases to resolve an alleged problem.",
    ),
    # 3. Emergency & Emotional Coercion
    FraudRule(
        rule_id="RULE_EMERGENCY_PRESSURE",
        category="emergency_pressure",
        patterns=[
            re.compile(r"\b(arrest|jail|police|warrant|lawsuit|legal\s+action)\s+(will\s+be\s+issued|immediately|against\s+you)\b", re.IGNORECASE),
            re.compile(r"\b(account|card|access)\s+(will\s+be|is)\s+(blocked|frozen|suspended|terminated)\b", re.IGNORECASE),
            re.compile(r"\b(in\s+hospital|car\s+accident|kidnapped|bail\s+money)\b", re.IGNORECASE),
        ],
        severity="HIGH",
        explanation="Using threats of arrest, legal prosecution, account termination, or family distress to induce panic.",
    ),
    # 4. Secrecy & Isolation
    FraudRule(
        rule_id="RULE_SECRECY_ISOLATION",
        category="secrecy_isolation",
        patterns=[
            re.compile(r"\b(do\s+not|don't)\s+(tell|discuss|speak\s+to|inform)\s+(anyone|your\s+family|bank|police|spouse)\b", re.IGNORECASE),
            re.compile(r"\b(keep\s+this|stay\s+on\s+the\s+line|strictly)\s+(confidential|secret|between\s+us)\b", re.IGNORECASE),
        ],
        severity="HIGH",
        explanation="Instructing the victim to maintain secrecy and not consult family members or bank personnel.",
    ),
    # 5. Authority Impersonation
    FraudRule(
        rule_id="RULE_AUTHORITY_IMPERSONATION",
        category="authority_impersonation",
        patterns=[
            re.compile(r"\b(calling\s+from|this\s+is)\s+(the\s+)?(fraud\s+department|security\s+division|irs|fbi|police|central\s+bank|interpol)\b", re.IGNORECASE),
            re.compile(r"\b(investigating\s+fraud|federal\s+agent|inspector|detective)\b", re.IGNORECASE),
        ],
        severity="MEDIUM",
        explanation="Impersonating law enforcement, tax agencies, or bank security teams to establish artificial credibility.",
    ),
    # 6. Verification Bypass
    FraudRule(
        rule_id="RULE_VERIFICATION_BYPASS",
        category="verification_bypass",
        patterns=[
            re.compile(r"\b(bypass|skip|ignore)\s+(the\s+)?(warning|verification|security\s+check|two[\s\-]factor)\b", re.IGNORECASE),
            re.compile(r"\b(press\s+accept|approve\s+the\s+prompt|allow\s+the\s+access)\b", re.IGNORECASE),
        ],
        severity="CRITICAL",
        explanation="Attempting to coerce victim into approving remote login prompts or bypassing two-factor authentication safeguards.",
    ),
]
