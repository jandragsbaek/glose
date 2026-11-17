---
title: What a language model does
course: Practical AI Engineering (sample course)
author: Anna Lindqvist
---

# What a language model does

> Sample course material for the Glose demo. Not a real course.

A language model predicts the next piece of text. Given everything written so far, it gives a probability for every token it knows, and one token is chosen. Then the process repeats with that token added.

Everything else a model seems to do, from answering questions to writing code, comes out of this one loop. That is why the same model can be useful for so many tasks, and also why it can sound sure of something that is false.

## Tokens, not words

Models do not read words. They read **tokens**: short pieces of text that a tokenizer cut the input into. A common English word is often one token; a rare word can be three or four.

- Token counts set the cost of a request.
- The context window is measured in tokens, not words.
- Languages with long compound words, such as Danish, often need more tokens for the same meaning.

## What training gives the model

During training the model sees a very large amount of text and adjusts its weights so that its predictions match what came next. It does not store the text. It stores patterns that make the next token likely.

This has a consequence you will meet every day in this course: the model knows what was common in its training data, up to the day the data was collected. It does not know your documents, and it does not know what changed last week.

## Exercise for today

Write down three questions about your own work that a model could not answer from training alone. Keep them; we use them on Day 3.
