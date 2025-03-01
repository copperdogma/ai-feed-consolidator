# Content Value First Principles

20240422: Created by Cam Marsollier with Claude 3.5 Sonnet
20240422: Updated by Cam Marsollier with Claude 3.5 Sonnet to map principles to analysis approaches
20240422: Updated by Cam Marsollier with Claude 3.5 Sonnet to add Answer-Forward Testing and refine summary focus

## Overview
This document defines the core principles for evaluating content value and guides our dual-approach system of quick summaries and deep analysis.

## Core Principles

### 1. Purpose & Nature (Primary for Quick Summary)
- Content type and format
- Time sensitivity
- Standalone vs series/narrative
- Primary function (inform, analyze, entertain)
- Target audience/required knowledge

### 2. Novelty & Change (Primary for Quick Summary)
- New information or developments
- Changes to existing understanding
- Why it matters now
- Impact and implications

### 3. Truth & Information Quality
- Factual accuracy
- Quality of evidence/sources
- Clarity of reasoning
- Logical implications of claims
- Gaps between assertions and conclusions
- Hidden assumptions in reasoning chains

### 4. Context & Dependencies
- Required background knowledge
- Related events/topics
- Historical precedents
- System interactions/dependencies

### 5. Perspective & Framing
- Identified biases/viewpoints
- Competing interpretations
- What's explicitly included vs omitted
- Assumptions made in the framing

## Summary Validation: Answer-Forward Testing

### Principle
A good summary should anticipate and answer the natural questions that arise from its own statements. If an important question arises that could be answered concisely, the summary should include that answer.

### Standard Questions by Content Type

#### Technical Content
- What is the new approach/technology?
- How does it differ from existing solutions?
- What are the key improvements/capabilities?
- What background knowledge is required?

#### News/Current Events
- What specifically changed/happened?
- Who is affected and how?
- When does it take effect?
- What are the immediate implications?

#### Analysis/Opinion
- What is the main argument?
- What evidence supports it?
- What are the key assumptions?
- What alternatives are considered?

#### Tutorial/Educational
- What will you learn?
- What prerequisites are needed?
- What practical applications exist?
- How long/deep is the content?

### Example: Answer-Forward Improvement

Poor Summary:
"Technical deep-dive explaining a new approach to quantum computing that claims 10x performance improvement. Requires understanding of quantum gates. Part 3 of ongoing series."

Natural Questions:
- What is the new approach?
- How does it achieve improvement?
- What parts are covered in this piece?

Improved Summary:
"Technical deep-dive: New quantum computing approach uses topological qubits for error correction, claiming 10x performance over standard gates. This part covers implementation details and hardware requirements. Requires understanding of quantum gates. Part 3 of ongoing series."

## Analysis Pattern

### Quick Summary Approach
Focus on:
1. Content type and purpose
2. What's new/important
3. Critical context/requirements
4. Natural follow-up questions

### Deep Analysis Prompt
```
Summarize this article's headline and main arguments, identify any implicit assumptions in its reasoning, and evaluate whether its conclusions logically follow from the evidence provided. Highlight any gaps or ambiguities that could undermine the argument. URL: [URL]
```

This prompt serves as a foundation for deep analysis, covering:
- Initial factual summary
- Assumption identification
- Logical evaluation
- Gap analysis

## Implementation Systems

### Quick Summary System ([content-summarizer.md](content-summarizer.md))
- 1-3 sentence format
- Answer-Forward Testing
- Focus on Purpose & Novelty
- Critical context only

### Deep Analysis System ([gpt-analyze.md](gpt-analyze.md))
- Comprehensive principle coverage
- Full logical analysis
- Complete context exploration
- Multiple perspective consideration

## Discussion Topics
- How to balance completeness vs conciseness in summaries?
- How to handle content that spans multiple types?
- What metrics can validate summary quality?
- How to adapt Answer-Forward Testing for different domains?
- Can we automate question generation for validation?

[This is a living document that will evolve as we deepen our understanding of content value principles.] 