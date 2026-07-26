# AWS + PostgreSQL Infrastructure Guide

## Prerequisites

| Tool | Install |
|---|---|
| AWS CLI v2 | https://aws.amazon.com/cli/ |
| AWS SAM CLI | https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html |
| Python 3.11 | https://python.org |
| Docker | Required for `sam build` |

---

## Step 1 — Set up Neon PostgreSQL (Free)

1. Sign up at https://console.neon.tech (no credit card)
2. Create project → region **AWS / ap-southeast-1 (Singapore)**
3. Note your **connection strings** from the dashboard:
   - **Pooled connection** (for Lambda): use as `DATABASE_URL` and `DATABASE_URL_SYNC`
4. Enable **connection pooling** (PgBouncer) — critical for Lambda cold starts

---

## Step 2 — Run Database Migrations

```bash
cd backend

# Install deps (use .venv)
python -m venv .venv311
.venv311\Scripts\activate       # Windows
# source .venv311/bin/activate  # Linux/macOS

pip install -r requirements.txt

# Set env vars
set DATABASE_URL_SYNC=postgresql://scanner:pass@ep-xxx.neon.tech/scandb?sslmode=require

# Run migrations
alembic upgrade head
```

---

## Step 3 — Configure AWS Credentials

```bash
aws configure
# AWS Access Key ID:     <from IAM console>
# AWS Secret Access Key: <from IAM console>
# Default region:        ap-southeast-1
# Output format:         json
```

---

## Step 4 — First SAM Deploy (Interactive)

```bash
# From project root
sam build --template infra/template.yaml

sam deploy --guided
# Stack name:        cci-sma-scanner
# Region:            ap-southeast-1
# Parameter DatabaseUrl:       <your Neon async URL>
# Parameter DatabaseUrlSync:   <your Neon sync URL>
# Parameter AdminCognitoSub:   scanner-admin  (update after first login)
# Confirm changes:   Y
# Allow IAM roles:   Y
# Save config:       Y  (creates samconfig.toml)
```

After deploy, note the **Outputs**:
- `ApiUrl` → paste into `frontend/src/environments/environment.prod.ts`
- `CognitoUserPoolId` → paste into environment.prod.ts
- `CognitoClientId` → paste into environment.prod.ts
- `CognitoHostedUiDomain` → paste into environment.prod.ts

---

## Step 5 — Create Your Cognito User

```bash
# Create user in the pool
aws cognito-idp admin-create-user \
  --user-pool-id ap-southeast-1_XXXXXXXX \
  --username your@email.com \
  --temporary-password TempPass123 \
  --user-attributes Name=email,Value=your@email.com Name=email_verified,Value=true \
  --region ap-southeast-1

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id ap-southeast-1_XXXXXXXX \
  --username your@email.com \
  --password YourPass123 \
  --permanent \
  --region ap-southeast-1
```

---

## Step 6 — Update Angular Environment + Deploy Frontend

1. Edit `frontend/src/environments/environment.prod.ts` with the SAM outputs
2. Commit and push to `aws` branch → GitHub Actions auto-deploys to GitHub Pages

---

## Step 7 — Set GitHub Secrets

Go to: **GitHub repo → Settings → Secrets and variables → Actions**

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `DATABASE_URL` | Neon async URL |
| `DATABASE_URL_SYNC` | Neon sync URL |
| `ADMIN_COGNITO_SUB` | Your Cognito sub (from first login) |
| `CORS_ORIGINS` | `https://jandginvestment.github.io,http://localhost:4200` |

---

## Step 8 — Update ADMIN_COGNITO_SUB

After logging in to the portal for the first time:
1. Open browser DevTools → Application → LocalStorage
2. Decode the `id_token` at https://jwt.io
3. Copy the `sub` field
4. Re-run `sam deploy` with `AdminCognitoSub=<your-sub>`  
   OR update the GitHub Secret and re-run the workflow.

---

## Local Development

```bash
# Start local PG + API
docker compose up

# In another terminal — run migrations against local DB
cd backend
set DATABASE_URL_SYNC=postgresql://scanner:devpass@localhost:5432/scandb
alembic upgrade head

# Run scanner locally against local DB
set DATABASE_URL=postgresql+asyncpg://scanner:devpass@localhost:5432/scandb
python scanner.py --watchlists watchlists/

# Start Angular dev server
cd frontend
npm install
npm start   # http://localhost:4200
```

---

## Cost Summary (Trial — Single User)

| Service | Cost |
|---|---|
| Neon PostgreSQL (free tier) | ₹0 |
| Lambda (free tier: 1M req/mo) | ₹0 |
| API Gateway HTTP API | ₹0 (12 months free tier) |
| Cognito (free: 50k MAU) | ₹0 |
| GitHub Pages | ₹0 |
| GitHub Actions | ₹0 |
| **Total** | **₹0–₹150/month** |

### Upgrade path

Change `DATABASE_URL` → AWS RDS PostgreSQL URL. No code changes.
