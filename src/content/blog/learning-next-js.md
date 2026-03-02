---
title: "Introduction to Next js"
author: "Meshack Kitonga"
pubDatetime: 2024-07-24T08:46:14Z
slug: introduction-to-nextjs-14
featured: false
draft: false
tags:
  - next js 14
  - frontend development
  - typescript
description: "This post details the process of building a simple application using next js(A React framework for building full-stack web applications)"
canonicalURL: ""
---

## Table of contents

## Introduction

Next.js is a React framework for building full-stack web applications. You use React Components to build user interfaces, and Next.js for additional features and optimizations. Under the hood, Next.js also abstracts and automatically configures tooling needed for React, like bundling, compiling, and more. This allows you to focus on building your application instead of spending time with configuration. [Readmore..](https://nextjs.org/docs).

You can read more about React [React](https://react.dev/)

## Main Features

- **Routing** - A file-system based router built on top of Server Components that supports layouts, nested routing, loading states, error handling, and more.-
- **Rendering** - Client-side and Server-side Rendering with Client and Server Components. Further optimized with Static and Dynamic Rendering on the server with Next.js. Streaming on Edge and Node.js runtimes.
- **Data Fetching** - Simplified data fetching with async/await in Server Components, and an extended fetch API for request memoization, data caching and revalidation.
- **Styling** - Support for your preferred styling methods, including CSS Modules, Tailwind CSS, and CSS-in-JS
- **Optimizations** - Image, Fonts, and Script Optimizations to improve your application's Core Web Vitals and User Experience.
- **TypeScript** - Improved support for TypeScript, with better type checking and more efficient compilation, as well as custom TypeScript Plugin and type checker.

## Difference between App Router and Pages Router

App Router is the newest Next js router, supporting the newest React's features such as Server Components and Streaming. Pages router (older router) allowed developers to build server-rendered React applications.

## Choosing a package manager for your application

I will go for [bun](https://bun.sh/) or [pnpm](https://pnpm.io/) any day any time. They are fast to work with. I guess you have an affinity for speed too 😄😄.

## Installing the package managers

Install bun ~ Linux

```python
curl -fsSL https://bun.sh/install | bash
```

Install bun ~ Windows

```python
powershell -c "irm bun.sh/install.ps1 | iex"
```

Install pnpm ~ Windows using powershell

```python
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

Install pnpm ~ Linux

```python
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

You can install pnpm using npm as well

```python
npm install -g pnpm
```

Now you are set to start installing packages for your development.

## Getting you started

Install
