"""Pipeline 1 -- the Gemini-backed GenAI pipeline. Runs alongside the
ground-truth pipeline on every complaint; a Gemini failure never crashes
complaint submission -- it degrades to ground-truth-only and flags for review
(see complaint_service.py in Phase 5).
"""

from typing import Any

from app.services.genai.gemini_client import call_gemini
from app.services.genai.injection_detector import detect as detect_injection
from app.services.genai.prompt_builder import PROMPT_VERSION, build_system_prompt, build_user_prompt
from app.services.genai.response_validator import validate_response

PROVIDER = "gemini"


class GenAIPipeline:
    def __init__(
        self,
        categories: dict[str, list[str]],
        departments: list[dict],
        api_key: str,
        model_name: str = "gemini-1.5-flash",
    ):
        self.categories = categories
        self.department_codes = {d["id"] for d in departments}
        self.api_key = api_key
        self.model_name = model_name
        self.system_prompt = build_system_prompt(categories, departments)

    async def process(
        self,
        complaint_text: str,
        metadata: dict[str, Any],
        policy_snippets: list[dict],
        valid_policy_ids: dict[str, str],
    ) -> dict[str, Any]:
        injection = detect_injection(complaint_text)
        base = {
            "is_prompt_injection": injection.is_injection,
            "injection_patterns": injection.patterns_found,
            "provider": PROVIDER,
            "prompt_version": PROMPT_VERSION,
        }

        if not self.api_key:
            return {**base, "status": "failed", "reason": "no_api_key"}

        user_prompt = build_user_prompt(complaint_text, metadata, policy_snippets)
        result = await call_gemini(self.system_prompt, user_prompt, self.api_key, self.model_name)

        if not result.success:
            return {
                **base,
                "status": "failed",
                "reason": "api_error",
                "error": result.error,
                "prompt_hash": result.prompt_hash,
                "model": result.model,
                "processing_time_ms": result.response_time_ms,
            }

        validation = validate_response(
            result.data, complaint_text, self.categories, self.department_codes, valid_policy_ids
        )

        return {
            **base,
            "status": "ok",
            **validation.data,
            "validation_issues": validation.issues,
            "processing_time_ms": result.response_time_ms,
            "prompt_hash": result.prompt_hash,
            "model": result.model,
            "raw_output": result.data,
        }
