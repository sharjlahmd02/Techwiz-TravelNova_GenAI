"""Thin wrapper around the DeepSeek API (OpenAI-compatible chat completions
endpoint): retries on failure, structured timing/logging metadata, and JSON
parsing. Never raises -- callers check `.success`.
"""

import asyncio
import hashlib
import json
import logging
import re
import time
from dataclasses import dataclass

import httpx

logger = logging.getLogger("genai.gemini_client")

DEEPSEEK_BASE_URL = "https://api.deepseek.com"
RETRY_ATTEMPTS = 3
RETRY_DELAY_SECONDS = 2
REQUEST_TIMEOUT_SECONDS = 60
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


async def _call_once(
    client: httpx.AsyncClient, model_name: str, api_key: str, system_prompt: str, user_prompt: str
) -> str:
    response = await client.post(
        f"{DEEPSEEK_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        },
    )
    response.raise_for_status()
    payload = response.json()
    return payload["choices"][0]["message"]["content"]


async def call_gemini(
    system_prompt: str,
    user_prompt: str,
    api_key: str,
    model_name: str = "deepseek-flash",
) -> GeminiCallResult:
    prompt_hash = _prompt_hash(system_prompt, user_prompt)
    start = time.perf_counter()

    last_error: str | None = None
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        for attempt in range(1, RETRY_ATTEMPTS + 1):
            try:
                raw_text = await _call_once(client, model_name, api_key, system_prompt, user_prompt)
                elapsed_ms = int((time.perf_counter() - start) * 1000)
                try:
                    data = json.loads(_strip_json_fences(raw_text))
                except json.JSONDecodeError as exc:
                    logger.warning("deepseek returned non-JSON (attempt %d): %s", attempt, exc)
                    last_error = f"invalid_json: {exc}"
                    if attempt < RETRY_ATTEMPTS:
                        await asyncio.sleep(RETRY_DELAY_SECONDS)
                        continue
                    return GeminiCallResult(False, None, last_error, elapsed_ms, prompt_hash, model_name, raw_text)

                logger.info(
                    "deepseek call ok model=%s prompt_hash=%s time_ms=%d attempt=%d",
                    model_name, prompt_hash, elapsed_ms, attempt,
                )
                return GeminiCallResult(True, data, None, elapsed_ms, prompt_hash, model_name, raw_text)

            except httpx.HTTPStatusError as exc:
                last_error = f"http_{exc.response.status_code}: {exc.response.text[:300]}"
                logger.warning("deepseek call failed (attempt %d): %s", attempt, last_error)
            except Exception as exc:  # noqa: BLE001 -- a DeepSeek failure must never crash submission
                last_error = str(exc)
                logger.warning("deepseek call failed (attempt %d): %s", attempt, exc)

            if attempt < RETRY_ATTEMPTS:
                await asyncio.sleep(RETRY_DELAY_SECONDS)

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return GeminiCallResult(False, None, last_error, elapsed_ms, prompt_hash, model_name)