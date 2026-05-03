# CarbonKrishi AI — A climate-smart rice LCA tool

## Quick start (Local)

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Run

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

## Deploy to Render (Production)

### Option 1: One-Click Deploy (Blueprint)

1. Push this repo to **GitHub**
2. Go to [render.com](https://render.com) → Sign up with GitHub
3. Click **Blueprint** → Connect your repo
4. Click **Apply** — Render will deploy automatically

### Option 2: Manual Deploy

1. Push this repo to **GitHub**
2. In Render Dashboard → **New +** → **Web Service**
3. Connect your GitHub repo
4. Select **Runtime: Docker**
5. Click **Deploy Web Service**

Your app will be live at `https://carbonkrishi.onrender.com` (or similar).

### What Gets Deployed

- **Landing page** at `/`
- **Dashboard** at `/dashboard`
- **API endpoints** at `/predict`, `/emissions`, `/credits`, etc.
- **Health check** at `/healthz`