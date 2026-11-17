---
title: Prompts are programs
course: Practical AI Engineering (sample course)
author: Anna Lindqvist
---

# Prompts are programs

> Sample course material for the Glose demo. Not a real course.

A prompt is not a question you ask a person. It is the input to a function whose output you want to control. Treat it the way you treat code: give it a clear structure, test it on cases you know, and change one thing at a time.

## The parts of a good prompt

1. **The role and the task.** What the model is, and what it must produce.
2. **The material.** The text it must work on, marked off clearly from the instructions.
3. **The form of the answer.** A format you can check, such as a list or a JSON object.
4. **Examples.** One or two worked cases do more than a paragraph of rules.

A prompt that mixes the task and the material in one paragraph is hard for the model to follow and hard for you to change.

## Test prompts on known cases

Keep a small set of inputs whose right answers you know. When you change a prompt, run all of them again. A change that fixes one case often breaks another, and you only see it if you look.

| Change                     | Cases fixed | Cases broken |
| -------------------------- | ----------- | ------------ |
| Added an example           | 3           | 1            |
| Moved the rules to the end | 1           | 0            |

## Exercise for today

Take one prompt you use often. Split it into the four parts above, and write two test cases for it.
