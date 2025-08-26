# Project Structure

This document outlines the structure of the `Recordkeeping_Technology` project.

## `llc-finance-api`

This directory contains the backend API for the application. It is a Python-based application using the FastAPI framework.

- `.env.example`: Example environment variables.
- `.gitignore`: Git ignore file.
- `Dockerfile`: Dockerfile for building the application container.
- `HANDOFF.md`: Handoff document.
- `README.md`: README file.
- `render.yaml`: Render deployment configuration.
- `requirements.txt`: Python dependencies.
- `app/`: Application source code.
  - `__init__.py`: Package initializer.
  - `db.py`: Database connection and session management.
  - `main.py`: Main application file with API endpoints.
  - `models.py`: Database models.
  - `plaid_client.py`: Plaid client for bank integration.
  - `schemas.py`: Pydantic schemas for data validation.
  - `security.py`: Security and authentication.

## `llc-finance-app`

This directory contains the frontend application. It is a simple HTML, CSS, and JavaScript application.

- `index.html`: The main HTML file.
- `css/`: CSS files for styling.
- `js/`: JavaScript files for application logic.
- `HANDOFF.md`: Handoff document.

## Other Files

- `.gitignore`: Git ignore file for the root directory.
- `DB, TD Bank, Plaid Integration.md`: Document about database and Plaid integration.
- `Foundational Graphic.html`: Foundational graphic.
- `Foundational Report.sty`: Foundational report style file.
- `From Codex.md`: Notes from Codex.
- `Gemini context aug26.md`: Log of a previous Gemini session.
