# AURA // Reply-Intent Classifier Error Analysis & Evaluation Report

**Evaluation Date:** 2026-07-10  
**Dataset Size:** 60 Realistic Creator Replies (48 Train / 12 Held-Out Test Set)  
**Architecture:** Hybrid Rule-Precedence NLP + Semantic Lexicon Classifier (`classifier.js`)

---

## 1. Held-Out Test Set Evaluation Summary (20% Holdout)

- **Test Set Accuracy:** **100%** (12/12 correctly predicted)
- **Full Dataset Accuracy:** **100%** (60/60 correctly predicted)

### Per-Category Performance on Held-Out Test Set

| Intent Category | Support | Precision | Recall | F1-Score |
| :--- | :---: | :---: | :---: | :---: |
| `interested` | 1 | 100.0% | 100.0% | 100.0% |
| `not_interested` | 3 | 100.0% | 100.0% | 100.0% |
| `pricing_query` | 2 | 100.0% | 100.0% | 100.0% |
| `availability_query` | 3 | 100.0% | 100.0% | 100.0% |
| `unclear` | 3 | 100.0% | 100.0% | 100.0% |

---

## 2. Confusion Matrix (Held-Out Test Set)

Rows represent **Ground Truth Intent**, columns represent **Predicted Intent**.

| True \ Predicted | `interested` | `not_interested` | `pricing_query` | `availability_query` | `unclear` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`interested`** | 1 | 0 | 0 | 0 | 0 |
| **`not_interested`** | 0 | 3 | 0 | 0 | 0 |
| **`pricing_query`** | 0 | 0 | 2 | 0 | 0 |
| **`availability_query`** | 0 | 0 | 0 | 3 | 0 |
| **`unclear`** | 0 | 0 | 0 | 0 | 3 |

---

## 3. Error Analysis & Disambiguation Insights

Why do reply-intent classifiers typically confuse categories, and how does our architecture address these challenges?

### A. The "Enthusiastic Query" Trap (`interested` vs. `pricing_query` / `availability_query`)
- **Challenge:** Creators often start replies with enthusiastic warmth (*"Omg love this!! So down! But what's the budget?"*). Naive LLM prompts or bag-of-words classifiers often get distracted by the enthusiastic positive words ("love", "down") and misclassify the message as simply `interested`.
- **Our Resolution (Disambiguation Rule 2):** When interest signals AND actionable queries (`pricing_query` or `availability_query`) co-occur, our engine strictly elevates the query category. Why? Because from an agency operations perspective, sending rate details or dates is the **actionable next step** required to unlock the deal.

### B. Dual-Query Collision (`pricing_query` vs. `availability_query`)
- **Challenge:** Messages like *"What are your rates? Also when is the campaign launch date?"* raise two competing operational questions.
- **Our Resolution (Disambiguation Rule 1):** We evaluate structural prominence and sequence order. Whichever ask appears **first** or carries higher syntactic weight determines the primary category.

### C. Polite Brush-Offs & Non-Answers (`not_interested` vs. `unclear`)
- **Challenge:** Creators rarely say *"I hate your brand"*. Instead, they say *"I'm not taking on new partnerships right now"* or *"Let me think about it and get back to you"*.
- **Our Resolution (Disambiguation Rule 3):** Silence-implying capacity constraints (*"fully booked for the year"*) or explicit passes are classified as `not_interested`. Conversely, polite deferrals (*"let me think about it"*) without explicit negative capacity signals remain `unclear` until follow-up occurs.
