/**
 * ============================================================================
 * AURA // CREATOR REPLY-INTENT CLASSIFIER - AUTOMATED EVALUATION SUITE
 * Evaluates classifier.js against the 60-example dataset & held-out test set.
 * Commits evaluation results and confusion matrix to eval_results/.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { classifyReplyIntent } = require('./classifier.js');

const DATASET_PATH = path.join(__dirname, 'dataset', 'creator_replies_dataset.json');
const OUTPUT_DIR = path.join(__dirname, 'eval_results');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load dataset
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));

const categories = [
  "interested",
  "not_interested",
  "pricing_query",
  "availability_query",
  "unclear"
];

function runEvaluation(dataSubset, labelName) {
  let correctCount = 0;
  const totalCount = dataSubset.length;
  const predictions = [];

  // Initialize confusion matrix: true_intent -> { predicted_intent: count }
  const confusionMatrix = {};
  categories.forEach(trueCat => {
    confusionMatrix[trueCat] = {};
    categories.forEach(predCat => {
      confusionMatrix[trueCat][predCat] = 0;
    });
  });

  // Per-category counts
  const categoryStats = {};
  categories.forEach(cat => {
    categoryStats[cat] = { truePositive: 0, falsePositive: 0, falseNegative: 0 };
  });

  dataSubset.forEach(item => {
    const prediction = classifyReplyIntent(item.message);
    const isCorrect = prediction.intent === item.true_intent;
    if (isCorrect) correctCount++;

    confusionMatrix[item.true_intent][prediction.intent] = 
      (confusionMatrix[item.true_intent][prediction.intent] || 0) + 1;

    if (isCorrect) {
      categoryStats[item.true_intent].truePositive++;
    } else {
      categoryStats[prediction.intent].falsePositive++;
      categoryStats[item.true_intent].falseNegative++;
    }

    predictions.push({
      id: item.id,
      message: item.message,
      true_intent: item.true_intent,
      predicted_intent: prediction.intent,
      confidence: prediction.confidence,
      rationale: prediction.rationale,
      correct: isCorrect,
      split: item.split,
      platform: item.platform,
      notes: item.notes
    });
  });

  const accuracy = totalCount > 0 ? (correctCount / totalCount) : 0;

  // Calculate Precision, Recall, F1
  const perCategoryMetrics = {};
  categories.forEach(cat => {
    const tp = categoryStats[cat].truePositive;
    const fp = categoryStats[cat].falsePositive;
    const fn = categoryStats[cat].falseNegative;

    const precision = (tp + fp) > 0 ? (tp / (tp + fp)) : 0;
    const recall = (tp + fn) > 0 ? (tp / (tp + fn)) : 0;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall / (precision + recall)) : 0;

    perCategoryMetrics[cat] = {
      precision: parseFloat(precision.toFixed(4)),
      recall: parseFloat(recall.toFixed(4)),
      f1_score: parseFloat(f1.toFixed(4)),
      support: tp + fn
    };
  });

  return {
    label: labelName,
    sample_count: totalCount,
    correct_predictions: correctCount,
    accuracy: parseFloat((accuracy * 100).toFixed(2)),
    per_category_metrics: perCategoryMetrics,
    confusion_matrix: confusionMatrix,
    predictions: predictions
  };
}

// 1. Evaluate on Held-Out Test Set (20% = 12 examples)
const testSet = dataset.filter(item => item.split === 'test');
const testResults = runEvaluation(testSet, "Held-Out Test Set (20%)");

// 2. Evaluate on Full Dataset (60 examples)
const fullResults = runEvaluation(dataset, "Full Dataset (60 Examples)");

// Save test set predictions
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'test_set_predictions.json'),
  JSON.stringify(testResults.predictions, null, 2),
  'utf8'
);

// Save complete evaluation metrics
const finalMetrics = {
  timestamp: new Date().toISOString(),
  held_out_test_set_metrics: {
    accuracy_percent: testResults.accuracy,
    correct_count: testResults.correct_predictions,
    total_count: testResults.sample_count,
    per_category_metrics: testResults.per_category_metrics,
    confusion_matrix: testResults.confusion_matrix
  },
  full_dataset_metrics: {
    accuracy_percent: fullResults.accuracy,
    correct_count: fullResults.correct_predictions,
    total_count: fullResults.sample_count,
    per_category_metrics: fullResults.per_category_metrics,
    confusion_matrix: fullResults.confusion_matrix
  }
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'evaluation_metrics.json'),
  JSON.stringify(finalMetrics, null, 2),
  'utf8'
);

// Generate Error Analysis Markdown Report
const errorAnalysisMd = `# AURA // Reply-Intent Classifier Error Analysis & Evaluation Report

**Evaluation Date:** ${new Date().toISOString().split('T')[0]}  
**Dataset Size:** 60 Realistic Creator Replies (48 Train / 12 Held-Out Test Set)  
**Architecture:** Hybrid Rule-Precedence NLP + Semantic Lexicon Classifier (\`classifier.js\`)

---

## 1. Held-Out Test Set Evaluation Summary (20% Holdout)

- **Test Set Accuracy:** **${testResults.accuracy}%** (${testResults.correct_predictions}/${testResults.sample_count} correctly predicted)
- **Full Dataset Accuracy:** **${fullResults.accuracy}%** (${fullResults.correct_predictions}/${fullResults.sample_count} correctly predicted)

### Per-Category Performance on Held-Out Test Set

| Intent Category | Support | Precision | Recall | F1-Score |
| :--- | :---: | :---: | :---: | :---: |
${categories.map(cat => {
  const m = testResults.per_category_metrics[cat];
  return `| \`${cat}\` | ${m.support} | ${(m.precision * 100).toFixed(1)}% | ${(m.recall * 100).toFixed(1)}% | ${(m.f1_score * 100).toFixed(1)}% |`;
}).join('\n')}

---

## 2. Confusion Matrix (Held-Out Test Set)

Rows represent **Ground Truth Intent**, columns represent **Predicted Intent**.

| True \\ Predicted | \`interested\` | \`not_interested\` | \`pricing_query\` | \`availability_query\` | \`unclear\` |
| :--- | :---: | :---: | :---: | :---: | :---: |
${categories.map(trueCat => {
  const row = testResults.confusion_matrix[trueCat];
  return `| **\`${trueCat}\`** | ${row.interested} | ${row.not_interested} | ${row.pricing_query} | ${row.availability_query} | ${row.unclear} |`;
}).join('\n')}

---

## 3. Error Analysis & Disambiguation Insights

Why do reply-intent classifiers typically confuse categories, and how does our architecture address these challenges?

### A. The "Enthusiastic Query" Trap (\`interested\` vs. \`pricing_query\` / \`availability_query\`)
- **Challenge:** Creators often start replies with enthusiastic warmth (*"Omg love this!! So down! But what's the budget?"*). Naive LLM prompts or bag-of-words classifiers often get distracted by the enthusiastic positive words ("love", "down") and misclassify the message as simply \`interested\`.
- **Our Resolution (Disambiguation Rule 2):** When interest signals AND actionable queries (\`pricing_query\` or \`availability_query\`) co-occur, our engine strictly elevates the query category. Why? Because from an agency operations perspective, sending rate details or dates is the **actionable next step** required to unlock the deal.

### B. Dual-Query Collision (\`pricing_query\` vs. \`availability_query\`)
- **Challenge:** Messages like *"What are your rates? Also when is the campaign launch date?"* raise two competing operational questions.
- **Our Resolution (Disambiguation Rule 1):** We evaluate structural prominence and sequence order. Whichever ask appears **first** or carries higher syntactic weight determines the primary category.

### C. Polite Brush-Offs & Non-Answers (\`not_interested\` vs. \`unclear\`)
- **Challenge:** Creators rarely say *"I hate your brand"*. Instead, they say *"I'm not taking on new partnerships right now"* or *"Let me think about it and get back to you"*.
- **Our Resolution (Disambiguation Rule 3):** Silence-implying capacity constraints (*"fully booked for the year"*) or explicit passes are classified as \`not_interested\`. Conversely, polite deferrals (*"let me think about it"*) without explicit negative capacity signals remain \`unclear\` until follow-up occurs.
`;

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'error_analysis.md'),
  errorAnalysisMd,
  'utf8'
);

console.log("================================================================================");
console.log("EVALUATION COMPLETE. RESULTS COMMITTED TO eval_results/");
console.log(`Held-Out Test Set Accuracy: ${testResults.accuracy}% (${testResults.correct_predictions}/${testResults.sample_count})`);
console.log(`Full Dataset Accuracy:      ${fullResults.accuracy}% (${fullResults.correct_predictions}/${fullResults.sample_count})`);
console.log("================================================================================");
