# LGU Payment System (NX Monorepo)

A LGU Payment System built using **NX Monorepo** architecture. The app features a frontend powered by **Next.js** and a backend API built with **NestJS**.

## Project Structure

This repository uses NX monorepo to manage the frontend and backend in a unified structure.

```
/apps
  /frontend (Next.js)
  /backend (NestJS)
  
/libs
  /shared (Common utilities, types, etc.)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or later)
- **NX CLI** (Optional: globally installed)

If you don't have the required tools, you can install them with the following commands:

```bash
# Install Node.js (latest LTS version)
nvm install --lts

# Install NX CLI globally
npm install -g nx
```

### Install Dependencies

Run the following command from the root of the project to install all dependencies:

```bash
npm install
```

---

## 🏗️ Development Setup

### 1. Run the Backend (NestJS API)

To run the **backend** (NestJS API), use:

```bash
# Start the backend API in development mode
nx serve backend
```

This will start the backend API server on `http://localhost:3333` (or the port specified in your `.env`).

### 2. Run the Frontend (Next.js)

To run the **frontend** (Next.js), use:

```bash
# Start the frontend app in development mode
nx serve frontend
```

This will start the frontend app on `http://localhost:4200` (or the port specified in your `.env`).

### 3. Run Both Simultaneously

If you want to run both the frontend and backend together, you can use the following command:

```bash
nx run-many --target=serve --all
```

This will run both the backend and frontend at the same time.

---

## 🔧 Build

### Build the Frontend

To build the **frontend** for production:

```bash
nx build frontend
```

### Build the Backend

To build the **backend** for production:

```bash
nx build backend
```

You can deploy the built apps from the `/dist` folder.

---

## 🔗 API Documentation

Once the **backend** API is running, you can view the Swagger API docs:

```bash
http://localhost:3333/api
```

This endpoint will display the automatically generated API documentation from **NestJS**.

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (React framework, SSR, SSG)
- **Backend**: [NestJS](https://nestjs.com/) (Node.js framework)
- **Database**: MongoDB
- **Monorepo**: [NX](https://nx.dev/) (Manage both frontend and backend in one repo)
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Vercel

---

## 📚 Libraries & Tools

- **nx** – Monorepo management
- **nestjs** – Node.js framework
- **next.js** – React framework
- **mongoose** – ODM for MongoDB
- **class-validator** – Input validation for NestJS
- **swagger** – API documentation for NestJS
- **OriginUI** – UI library

---

## 🧠 Contribution

To keep our Git history clean, consistent, and easy to understand, please follow the conventions below when creating branches or committing code.

---

### 🌱 Branch Naming Convention

Use the following format for naming your branches:

```
<type>/<short-description>
```

#### 🔧 Examples:
- `feature/login-page`
- `bugfix/fix-crash`
- `hotfix/critical-patch`
- `chore/update-deps`
- `refactor/improve-performance`

#### 🔹 Common Branch Types:
| Type         | Description                             |
|--------------|-----------------------------------------|
| `feature`    | New features or functionality           |
| `adjustment` | Changes to existing features or styles  |
| `bugfix`     | Fixes for bugs or issues                |
| `hotfix`     | Urgent fixes for production issues      |
| `chore`      | Maintenance tasks (e.g. updating deps)  |
| `refactor`   | Code restructuring with no new features |
| `test`       | Adding or updating tests                |
| `docs`       | Documentation-only changes              |

---

### ✍️ Commit Message Style

We follow the **Conventional Commits** format:

```
<type>(optional-scope): <short, imperative summary>
```

#### 🔹 Commit Types:
| Type       | Description                                           |
|------------|-------------------------------------------------------|
| `feat`     | A new feature                                         |
| `adjust`   | A change in an existing feature                       |
| `fix`      | A bug fix                                             |
| `docs`     | Documentation changes only                            |
| `style`    | Changes that don't affect logic (e.g. formatting)     |
| `refactor` | Code changes that neither fix a bug nor add a feature |
| `perf`     | Code change that improves performance                 |
| `test`     | Adding or modifying tests                             |
| `chore`    | Routine tasks or tooling changes                      |

#### 🔧 Examples:
- `feat(auth): add Google login`
- `fix(game): prevent null reference crash`
- `docs(readme): update setup instructions`
- `refactor(ui): simplify navbar layout`
- `chore: update eslint config`
- `test: add unit tests for score system`

---
