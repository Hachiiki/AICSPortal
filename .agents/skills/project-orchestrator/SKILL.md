---
name: project-orchestrator
description: Central orchestrator for the project. Use this skill whenever you receive a complex task or when the user asks you to figure out which skills to use. It guides the AI to analyze the task, select the most appropriate combination of available project skills, and formulate an execution plan.
---

# Project Orchestrator

Your primary role when using this skill is to act as the Chief Orchestrator for this project. You will analyze complex user requests, break them down into actionable steps, and explicitly determine which of the available project skills are required to complete the task.

## Core Workflow

1.  **Task Analysis**: Carefully evaluate the user's request. What is the ultimate goal? What are the implicit and explicit requirements?
2.  **Skill Discovery**: Review the list of available skills provided in your context (the `<skills>` section). You have a vast array of specialized skills (e.g., `fullstack-dev`, `ui-ux-pro-max`, `image-generation`, `design`, `coding-agent`, `seo-content-writer`, etc.).
3.  **Skill Matching & Planning**: 
    *   Map the components of the user's task to the most relevant skills.
    *   Create a step-by-step execution plan where each step explicitly names the skill(s) that will be used.
    *   *Rule of Thumb*: Never use a generic approach if a specialized skill exists for the task.
4.  **Communication**: Present the execution plan to the user. Explicitly state: "To accomplish this, I will use the following skills: [Skill A], [Skill B]..."
5.  **Execution/Delegation**: Execute the plan by either following the skill instructions yourself sequentially, or by invoking specialized subagents and directing them to use specific skills.

## Example Scenarios

*   **Scenario A**: User says, "I need to build a new dashboard page for user analytics."
    *   *Orchestrator Plan*: Use `ui-ux-pro-max` to design the layout, `charts` to design the data visualizations, and `fullstack-dev` to implement the React/Next.js code.
*   **Scenario B**: User says, "Help me write a blog post about our new AI feature and create a cover image."
    *   *Orchestrator Plan*: Use `blog-writer` or `seo-content-writer` for the text, and `image-generation` for the cover art.
*   **Scenario C**: User says, "Look into this bug where the login page is slow."
    *   *Orchestrator Plan*: Use `diagnosing-bugs` to trace the issue, and potentially `coding-agent` to implement the fix.

## Principles

*   **Be decisive**: Don't just list all skills; pick the *best* ones for the specific task.
*   **Chain skills logically**: Think about the input/output of each skill (e.g., Design Skill outputs a blueprint, which might feed into another skill).
*   **Project Specificity**: Remember this orchestrator is for *this* specific project's needs. Tailor your routing to the domains relevant here (e.g., web dev, AI integrations, content generation).
*   **Always Unslop**: You must ALWAYS include the `unslop` skill in your execution plan to ensure any generated text or content is free of AI "tells" and slop.
