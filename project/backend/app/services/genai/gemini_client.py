"""Thin wrapper around the Gemini API: retries on failure, structured
timing/logging metadata, and JSON parsing. Never raises -- callers check
`.success`.

Uses the current `google-genai` SDK. The older `google-generativeai` package
is fully sunset (raises FutureWarning on import, and old model names like
gemini-1.5-flash 404 for new API keys) -- confirmed live against a real key
during development, along with the fact that gemini-3.8-flash (the model the
API itself recommends for new users) intermittently returns 503 UNAVAILABLE
under load, hence RETRY_ATTEMPTS=3 rather than the more conservative 1 retry
mentioned in claude.md.
"""

import asyncio
import hashlib
import json
import logging
import re
import time
from dataclasses import dataclass

from google import genai
from google.genai import types

logger = logging.getLogger("genai.gemini_client")

RETRY_ATTEMPTS = 3
RETRY_DELAY_SECONDS = 2
_JSON_FENCE_PATTERN = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE | re.MULTILINE)


@dataclass
class GeminiCallResult:
    success: bool
    data: dict | None
    error: str | None
    response_time_ms: int
    prompt_hash: str
    model: str
    raw_text: str | None = None


def _strip_json_fences(text: str) -> str:
    return _JSON_FENCE_PATTERN.sub("", text).strip()


def _prompt_hash(system_prompt: str, user_prompt: str) -> str:
    return hashlib.sha256(f"{system_prompt}\n---\n{user_prompt}".encode("utf-8")).hexdigest()[:16]


def _call_once(client: genai.Client, model_name: str, system_prompt: str, user_prompt: str) -> str:
    response = client.models.generate_content(
        model=model_name,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )
    return response.text


async def call_gemini(
    system_prompt: str,
    user_prompt: str,
    api_key: str,
    model_name: str = "gemini-3.8-flash",
) -> GeminiCallResult:
    prompt_hash = _prompt_hash(system_prompt, user_prompt)
    start = time.perf_counter()

    client = genai.Client(api_key=api_key)

    last_error: str | None = None
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            raw_text = await asyncio.to_thread(_call_once, client, model_name, system_prompt, user_prompt)
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            try:
                data = json.loads(_strip_json_fences(raw_text))
            except json.JSONDecodeError as exc:
                logger.warning("gemini returned non-JSON (attempt %d): %s", attempt, exc)
                last_error = f"invalid_json: {exc}"
                if attempt < RETRY_ATTEMPTS:
                    await asyncio.sleep(RETRY_DELAY_SECONDS)
                    continue
                return GeminiCallResult(False, None, last_error, elapsed_ms, prompt_hash, model_name, raw_text)

            logger.info(
                "gemini call ok model=%s prompt_hash=%s time_ms=%d attempt=%d",
                model_name, prompt_hash, elapsed_ms, attempt,
            )
            return GeminiCallResult(True, data, None, elapsed_ms, prompt_hash, model_name, raw_text)

        except Exception as exc:  # noqa: BLE001 -- Gemini failures must never crash submission
            last_error = str(exc)
            logger.warning("gemini call failed (attempt %d): %s", attempt, exc)
            if attempt < RETRY_ATTEMPTS:
                await asyncio.sleep(RETRY_DELAY_SECONDS)

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return GeminiCallResult(False, None, last_error, elapsed_ms, prompt_hash, model_name)
