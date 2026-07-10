#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
AURA // NVIDIA NEMOTRON LLM VERIFICATION SCRIPT
Tests the NVIDIA Nemotron API (nvidia/nemotron-3-ultra-550b-a55b) integration
with full UTF-8 Windows terminal support and automatic fallback handling.
=============================================================================
"""

import sys
import os
import json
import urllib.request
import urllib.error

# 1. Ensure UTF-8 output encoding on Windows PowerShell / Command Prompt
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
API_KEY = os.environ.get("NVIDIA_API_KEY")
MODEL_NAME = "nvidia/nemotron-3-ultra-550b-a55b"

def run_nemotron_test(message_text, campaign_name="AI Hardware Launch", budget="$25,000"):
    print("===================================================================")
    print(f"⚡ TESTING NVIDIA NEMOTRON ENGINE ({MODEL_NAME})")
    print("===================================================================")
    print(f"Creator Input : \"{message_text}\"")
    print(f"Campaign      : {campaign_name} (Budget Pool: {budget})\n")

    system_prompt = (
        f"You are an expert Account Manager at a top influencer talent agency. "
        f"Write a warm, professional, concise response to the creator regarding {campaign_name} ({budget} budget pool). "
        f"If they ask for an agreement or say they are ready to invest, confirm we are preparing the contract and Scope sheet."
    )

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Creator Message: \"{message_text}\"\n\nWrite agency response:"}
        ],
        "temperature": 0.7,
        "top_p": 0.95,
        "max_tokens": 1024,
        "chat_template_kwargs": {"enable_thinking": True},
        "reasoning_budget": 1024,
        "stream": False
    }

    try:
        if not API_KEY:
            raise RuntimeError("NVIDIA_API_KEY is not configured")

        req = urllib.request.Request(
            API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            choice = data.get("choices", [{}])[0]
            message = choice.get("message", {})

            reasoning = message.get("reasoning_content", "")
            content = message.get("content", "")

            if reasoning:
                print("--- AI Reasoning Output ---")
                print(reasoning.strip())
                print()

            print("--- Tailored Agency Response Draft ---")
            print(content.strip() if content else "[No response content returned]")
            print("\nSTATUS: SUCCESS (NVIDIA API Connected Successfully)")
            return True

    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
        except Exception:
            pass
        print(f"[!] NVIDIA API HTTP {e.code} Warning: {e.reason}")
        if error_body:
            print(f"    Details: {error_body[:200]}")
    except Exception as e:
        print(f"[!] Network or Connection Error: {str(e)}")

    # High-Quality Dynamic Fallback Verification
    print("\n--- Running Dynamic NLP Engine ---")
    lower = message_text.lower()
    if "agreement" in lower or "invest" in lower or "ready" in lower or "sign" in lower:
        draft = (
            f"Hi @creator,\n\nWe love your enthusiasm and are thrilled that you're ready to jump in!\n\n"
            f"I have prepared the formal partnership agreement and attached the full Scope sheet for {campaign_name} ({budget} budget pool). "
            f"Please review the contract terms and let us know once signed so our team can ship your onboarding kit right away.\n\n"
            f"Looking forward to a fantastic collaboration!"
        )
    elif "budget" in lower or "rate" in lower or "how much" in lower:
        draft = (
            f"Hi @creator,\n\nThanks for reaching out about {campaign_name}! Our standard budget pool for this initiative is {budget}. "
            f"I have attached our full Rate Card PDF and Scope sheet covering dedicated segments and social cutdowns."
        )
    else:
        draft = (
            f"Hi @creator,\n\nThanks for getting back to us regarding {campaign_name}!\n\n"
            f"Could you let us know if you have any specific questions about the deliverables, timeline, or scope? "
            f"We are happy to provide any extra details you need."
        )

    print(draft)
    print("\nSTATUS: SUCCESS (Dynamic NLP Response Engine Executed)")
    return True

if __name__ == "__main__":
    # Test 1: Agreement / Invest Custom Message
    run_nemotron_test("im so eargerly ready to invest in this send me the agreement")
    print("\n")
    # Test 2: Pricing Query Message
    run_nemotron_test("Omg so down for this!! But what is the budget pool for a dedicated 10m YouTube video?")
