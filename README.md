# 📦 Enterprise Inventory & POS Management System

A robust, full-stack Inventory & Point of Sale (POS) Management System built with **Django REST Framework**, **React (Vite)**, **PostgreSQL**, and **MinIO Object Storage**, fully containerized with **Docker Compose**. Includes AI-powered demand forecasting via Google Gemini.

---

## ✨ Features

- **Inventory & Catalog Management**: Manage products, categories, SKU/barcodes, reorder levels, and product images.
- **Barcode & QR Code Integration**: Generate and live-scan barcodes and QR codes for rapid stock lookup and checkout.
- **Stock & Purchase Tracking**: Track batch lots, supplier purchases, unit costs, and automated stock adjustments.
- **Sales & POS Billing**: Fast checkout, FIFO costing calculation, customizable discount vouchers, invoice generation, and PDF printing.
- **AI-Powered Demand Forecasting**: Integrated Google Gemini 2.5 Flash for inventory intelligence, restock suggestions, and trend insights.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Admin and Staff members.
- **Trash & Soft-Delete Recovery**: Safe soft deletion and restore system for products, categories, sales, and purchases.
- **Audit Logging**: Trace all critical operations across the entire application.
- **Cloud-Native Media Storage**: Scalable MinIO S3-compatible object storage support.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, MUI (Material-UI), React Router 7, Recharts, Axios, ZXing Scanner |
| **Backend** | Python 3.11, Django 5.2, Django REST Framework, SimpleJWT, Gunicorn, ReportLab |
| **Database** | PostgreSQL 16 Alpine |
| **Storage** | MinIO Object Storage (S3 API compatible) |
| **Deployment** | Docker, Docker Compose, Nginx Alpine |

---

## 📋 Prerequisites

Before running the application, make sure you have installed:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker Engine + Docker Compose v2)
- [Git](https://git-scm.com/)

---

## 🚀 Quick Start (Recommended: Docker Compose)

### 1. Clone the Repository
```bash
git clone https://github.com/HasaanAhmad6/Inventory_Management_System.git
cd Inventory_Management_System
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
# On Linux / macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```

Open `.env` and configure your settings:
- `SECRET_KEY`: Set a long random secret key.
- `POSTGRES_PASSWORD`: Choose a strong password for PostgreSQL.
- `GEMINI_API_KEY`: *(Optional)* Add your Google Gemini API key for AI demand forecasting.
- `USE_MINIO`: Set to `True` to enable MinIO S3 media storage (recommended), or `False` for local storage.

### 3. Build & Start the Containers
Run Docker Compose in detached mode:
```bash
docker compose up -d --build
```

Docker will automatically:
1. Start the PostgreSQL 16 database.
2. Launch MinIO and automatically configure the storage bucket (`invms-media`).
3. Build the Django backend, run database migrations, collect static files, and start Gunicorn.
4. Build the React frontend production bundle and serve it via Nginx on port 8080.

---

## 🌐 Application Endpoints

Once the containers are running:

| Service | URL | Default Port |
| :--- | :--- | :--- |
| **Frontend Application** | [http://localhost:8080](http://localhost:8080) | `8080` |
| **Backend API & Admin** | [http://localhost:8000/api/](http://localhost:8000/api/) | `8000` |
| **MinIO Web Console** | [http://localhost:9001](http://localhost:9001) | `9001` |
| **MinIO S3 Endpoint** | [http://localhost:9000](http://localhost:9000) | `9000` |

---

## 👤 Creating / Resetting Superuser Account

To create a new superadmin account to sign in:

### Method 1: Interactive Prompt
```bash
docker compose exec backend python manage.py createsuperuser
```

### Method 2: Quick Command (Non-interactive)
```bash
docker compose exec backend python manage.py shell -c "from inventory.models import User; u, _ = User.objects.get_or_create(username='admin', defaults={'email': 'admin@example.com', 'role': 'admin', 'is_superuser': True, 'is_staff': True}); u.set_password('Admin@12345'); u.save(); print('Admin account created: admin / Admin@12345')"
```

You can now navigate to [http://localhost:8080](http://localhost:8080) and sign in!

---

## 💻 Local Development (Without Docker)

If you prefer to run services individually for local code development:

### 1. PostgreSQL & MinIO
Ensure PostgreSQL and MinIO are running locally or use docker for dependencies only:
```bash
docker compose up -d db minio minio-init
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start Django development server
python manage.py runserver 0.0.0.0:8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install node modules
npm install

# Start Vite development server
npm run dev
```
The frontend dev server will typically run on `http://localhost:5173`.

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SECRET_KEY` | Django secret key | - |
| `DEBUG` | Enable/disable Django debug mode | `False` |
| `ALLOWED_HOSTS` | Comma-separated list of allowed host headers | `127.0.0.1,localhost` |
| `CORS_ALLOWED_ORIGINS` | Allowed origins for cross-origin requests | `http://127.0.0.1:8080` |
| `POSTGRES_DB` | PostgreSQL database name | `inventory_db` |
| `POSTGRES_USER` | PostgreSQL user | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | - |
| `POSTGRES_HOST` | Host address of PostgreSQL server (`db` in Docker) | `db` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `GEMINI_API_KEY` | Google Gemini API key for AI forecasts | - |
| `USE_MINIO` | Use MinIO object storage for media files | `True` |
| `MINIO_INTERNAL_ENDPOINT`| Internal URL for backend to reach MinIO | `http://minio:9000` |
| `MINIO_PUBLIC_ENDPOINT`  | Public URL for browser media file downloads | `http://127.0.0.1:9000` |
| `MINIO_ROOT_USER`        | MinIO console & access username | `minioadmin` |
| `MINIO_ROOT_PASSWORD`    | MinIO console & secret password | `minioadmin` |
| `MINIO_BUCKET_MEDIA`     | Default bucket name for uploads | `invms-media` |

---

## 🔧 Useful Docker Commands

```bash
# View live logs for all services
docker compose logs -f

# View logs for backend only
docker compose logs -f backend

# Restart services
docker compose restart

# Stop all containers
docker compose down

# Re-run migrations manually
docker compose exec backend python manage.py migrate

# Collect static files
docker compose exec backend python manage.py collectstatic --noinput
```

---

## 🛡️ License

This project is licensed under the MIT License - see the LICENSE file for details.
