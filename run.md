# How to Run Kynari Locally

The Kynari application uses a monorepo structure. It consists of a **Next.js Frontend (Web App)** and a **FastAPI Python Backend (API)**. 

To run the application locally, you'll need to start both services in separate terminal windows.

## Prerequisites
Ensure you have the following installed:
- **Node.js** & **pnpm** (for the frontend web app)
- **Python 3.12+** & **uv** (for the backend API and ML models)
- Valid `.env` files in both the `apps/web` and `packages/api` directories.

---

## 🚀 1. Start the Backend API (FastAPI)

The backend handles the machine learning models (audio/face analysis), database connections, and API endpoints.

1. Open a new terminal window.
2. Navigate to the API package directory:
   ```bash
   cd packages/api
   ```
3. Start the server using `uv`:
   ```bash
   uv run uvicorn main:app --reload --port 8000
   ```

*The API will start at `http://127.0.0.1:8000`. You can access the auto-generated Swagger documentation at `http://127.0.0.1:8000/docs`.*

---

## 💻 2. Start the Frontend (Next.js)

The frontend is the web application you interact with in the browser.

1. Open a second terminal window (keep the backend running in the first).
2. Ensure you are in the **project root folder** (`.../Kynari`).
3. Start the development server using pnpm / turbo:
   ```bash
   pnpm dev
   ```

*The frontend web app will start typically at `http://localhost:3000`.*

---

## Troubleshooting

- **`Could not import module "main"` when starting uvicorn?**
  Make sure you ran the `uvicorn` command *inside* the `packages/api` directory, not the project root.
  
- **Dependencies out of date?**
  - **Backend:** Inside `packages/api`, run `uv sync` to ensure your ML and Python dependencies are up to date.
  - **Frontend:** Inside the project root, run `pnpm install` if you're missing Node modules.
