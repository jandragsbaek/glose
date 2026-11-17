---
title: Retrieval before generation
course: Practical AI Engineering (sample course)
author: Anna Lindqvist
---

# Retrieval before generation

> Sample course material for the Glose demo. Not a real course.

A language model answers from what it learned in training. It does not know your documents, and it does not know what changed last week. Retrieval-augmented generation (RAG) closes that gap: before the model writes, a search step finds passages that are likely to hold the answer and puts them into the prompt.

The idea is simple, but each part can fail on its own. The search can miss the passage that matters. The passage can be found but cut in the wrong place. Or the model can ignore what it was given and answer from memory anyway.

## Chunking decides what can be found

Documents are split into chunks before they are embedded. A chunk that is too small loses the context that makes it meaningful; a chunk that is too large blurs several ideas into one vector, and the search ranks it lower for each of them.

A good default is to split on the document's own structure, headings and paragraphs, and only then by length. Overlap of 10–15% between neighbouring chunks keeps a sentence that straddles a boundary findable from both sides.

Chunk size is not a constant to copy from a blog post. It depends on how your users ask: short factual questions favour small chunks, while questions that need an argument favour larger ones.

## Evaluate retrieval apart from generation

When an answer is wrong, first ask whether the right passage was retrieved at all. If it was not, no prompt will save the answer. Measure this directly: for a set of questions with known source passages, count how often the passage is in the top five results.

```python
def recall_at_k(questions, search, k=5):
    hits = sum(1 for q in questions if q.source in search(q.text)[:k])
    return hits / len(questions)
```

Only when retrieval is good does it make sense to tune the prompt that turns passages into an answer.

## When the model ignores the passage

Sometimes the right passage is in the prompt and the model still answers from memory. Two habits help. Put the passages before the question, so the question is the last thing the model reads. And ask the model to quote the sentence its answer rests on; an answer that cannot quote its source is a warning.

## Exercise for today

Take your three questions from Day 1. For each, write down which document would hold the answer and which paragraph in it. That is your first retrieval test set.
