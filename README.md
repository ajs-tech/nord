# toddle - the open-source visual frontend framework

Create highly performant web apps with SSR, branching, version control, components, and much more! Visit [toddle.dev](https://toddle.dev?utm_medium=web&utm_source=GitHub) to learn more

[Discord](https://discord.com/invite/svBKYZf3UR) | [BlueSky](https://bsky.app/profile/toddle.dev) | [YouTube](https://youtube.com/@toddledev) | [LinkedIn](https://www.linkedin.com/company/toddledev) | [X](https://x.com/toddledev/)

![Test status](https://github.com/toddledev/toddle/actions/workflows/test.yml/badge.svg)

## Introduction

This repository holds different packages that are used internally by the toddle framework. The packages that are currently available are:

- core 👈 holds core (shared) logic used by the other packages
- ssr 👈 holds part of the server-side rendering logic

## Requirements

Install using [bun](https://bun.sh/) by running `bun install`

### Commands

- Lint: `bun lint`
- Check types: `bun typecheck`
- Test: `bun test`

## Status

While we consume all packages internally in the toddle framework, this project is currently in development and is not yet ready for other applications to consume.

## Plan

As [announced in July '24](https://toddle.dev/blog/toddle-is-soon-open-source), toddle is going open source. The goal is to move more and more code into this repository and make it possible to self host a toddle application.

### Packages

The next packages that will be moved into this repository are:

- runtime 👈 the runtime needed to run a toddle application on the client
- lib 👈 the core library of [formulas](https://toddle.dev/docs/formula-editor) and [actions](https://toddle.dev/docs/workflows) used by the runtime (formulas are also used during server-side rendering)
- search 👈 the code that powers the issue panel in toddle

Also, we plan to move more and more of the server-side rendering logic into this repository.

### Releases

Currently, we're not using GitHub releases, but once the repository is more mature, we will start using them. Later, we also aim to publish the packages to npm/jsr

## Contributing

If you find a bug or have an idea for a new feature, please open an issue. We also welcome pull requests. We are actively monitoring this repository.

If you have any questions, feel free to ask them in our [Discord](https://discord.com/invite/svBKYZf3UR) or reach out by [e-mail](mailto:hello@toddle.dev)
