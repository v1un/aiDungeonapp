# Mystic Chatways: Contributing Guidelines

## Welcome Contributions!

Contributions to Mystic Chatways are highly welcome and appreciated! Whether you're fixing a bug, proposing a new feature, or improving documentation, your help is valuable. This document provides guidelines to ensure a smooth contribution process.

## General Contribution Workflow

We follow a standard GitHub fork and pull request workflow.

1.  **Fork the Repository**:
    Start by forking the main Mystic Chatways repository to your own GitHub account.

2.  **Create a Branch**:
    Before making any changes, create a new branch in your forked repository. Use a descriptive name for your branch, such as:
    *   For new features: `feature/your-feature-name` (e.g., `feature/add-character-portraits`)
    *   For bug fixes: `bugfix/issue-123` (if fixing a specific issue) or `bugfix/describe-the-fix`
    ```bash
    git checkout -b feature/your-feature-name
    ```

3.  **Make Your Changes**:
    Implement your feature or bug fix in your dedicated branch.

4.  **Code Style and Quality**:
    *   Ensure your code adheres to the project's coding standards. See the "Code Style" section below for more details.
    *   Run linters and type checkers as applicable (see "Code Style").

5.  **Write Tests**:
    *   If you are adding new features or fixing bugs, please write appropriate unit or integration tests to cover your changes. (Note: Specific testing frameworks or guidelines should be detailed here if they become established in the project).

6.  **Commit Your Changes**:
    *   Commit your changes with clear, descriptive, and concise commit messages. This helps reviewers understand the purpose of your changes.
    *   A good commit message might be: `feat: Add support for custom character avatars` or `fix: Resolve issue with inventory display`.

7.  **Push to Your Fork**:
    Push your committed changes to your branch on your forked repository.
    ```bash
    git push origin feature/your-feature-name
    ```

8.  **Submit a Pull Request (PR)**:
    *   Once your changes are ready, submit a Pull Request (PR) from your branch to the `main` branch (or the relevant development branch) of the original Mystic Chatways repository.

## Pull Request Guidelines

When submitting a Pull Request, please ensure you:

*   **Provide a Clear Description**:
    *   The PR title should be concise and summarize the change.
    *   The PR description should clearly explain the purpose of the changes, what problem it solves, or what feature it adds.
*   **Link to Issues**:
    *   If your PR addresses an existing GitHub Issue, please link to it in the PR description (e.g., "Closes #123" or "Fixes #456").
*   **Keep PRs Focused**:
    *   Try to keep your PRs focused on a single feature or bug fix. Smaller, focused PRs are easier and faster to review.
*   **Respond to Feedback**:
    *   Be prepared to respond to feedback and make changes to your PR if requested by the maintainers.

## Code Style

Maintaining a consistent code style is important for readability and maintainability.

*   **Linters and Formatters**:
    *   The project uses ESLint for linting and TypeScript for type checking. Please ensure your code passes these checks before submitting a PR.
    *   You can run the linter using the script defined in `package.json`:
        ```bash
        npm run lint
        ```
        (This script executes `next lint`).
    *   You can run the TypeScript type checker using:
        ```bash
        npm run typecheck
        ```
        (This script executes `tsc --noEmit`).
*   **Existing Style**:
    *   For aspects not explicitly covered by automated tools, please try to follow the coding style and conventions used in the existing codebase.

## Reporting Bugs

If you encounter a bug, please help us by reporting it.

*   **How to Report**:
    *   The preferred way to report bugs is by creating a new issue in the GitHub Issues section of the repository.
*   **Information to Include**:
    *   **Clear Title**: A concise title that summarizes the bug.
    *   **Steps to Reproduce**: Detailed steps on how to reproduce the bug.
    *   **Expected Behavior**: What you expected to happen.
    *   **Actual Behavior**: What actually happened, including any error messages.
    *   **Environment Details**: Information about your environment, such as browser version, operating system, Node.js version, etc. (if relevant).
    *   **Screenshots/GIFs**: Visual aids can be very helpful in understanding the issue.

## Suggesting Enhancements

We welcome suggestions for new features or improvements to existing ones.

*   **How to Suggest**:
    *   The best way to suggest an enhancement is by creating a new issue in the GitHub Issues section.
    *   Clearly label the issue as an "enhancement" or "feature request."
*   **Information to Include**:
    *   **Clear Title**: A concise title that summarizes the enhancement.
    *   **Detailed Description**: Explain the proposed enhancement, why it would be beneficial, and how it might work.
    *   **Use Cases**: Describe scenarios where this enhancement would be useful.
    *   **Mockups/Examples (Optional)**: If applicable, visual mockups or examples can help illustrate your idea.

Thank you for considering contributing to Mystic Chatways!
