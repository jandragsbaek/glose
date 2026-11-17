---
title: Embeddings and similarity
course: Practical AI Engineering (sample course)
author: Anna Lindqvist
---

# Embeddings and similarity

> Sample course material for the Glose demo. Not a real course.

An embedding turns a piece of text into a list of numbers, a vector, so that texts with similar meaning get vectors that point in similar directions. Search by meaning is then a matter of finding the vectors closest to the vector of the question.

## Cosine similarity

The usual measure of closeness is the cosine of the angle between two vectors. It ignores length and looks only at direction, which is what you want when one text is longer than another.

## What embeddings miss

Embeddings are good at topic and poor at detail. Two sentences that say opposite things about the same subject can have very similar vectors. Exact names, numbers and negation are where pure vector search fails most often, which is why many systems combine it with keyword search.

## Exercise for today

Find two sentences in your own documents that mean opposite things but share most of their words. Predict whether their embeddings will be close, then check.
