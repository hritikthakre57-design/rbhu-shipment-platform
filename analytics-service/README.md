# Analytics service

This private Flask service accepts sales CSV files from the Express API. The browser never calls it directly.

## Setup

From `analytics-service/` in PowerShell:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

## Run

```powershell
.\.venv\Scripts\python.exe app.py
```

The service listens on `http://127.0.0.1:5001` by default. Set `PORT` to use another port.

## Test

```powershell
.\.venv\Scripts\python.exe -m pytest
```

## Contract

`GET /health` returns:

```json
{"status":"ok","service":"analytics-service"}
```

`POST /analyze` accepts a multipart field named `file`. The file must be a CSV with `salesperson`, `revenue`, and `region` columns. It returns summary statistics, Plotly figure JSON for `Revenue by Region` and `Top Salespeople`, and any row-cleaning warnings.

Errors use this shape:

```json
{"error":{"code":"MISSING_COLUMNS","message":"Required columns are missing","details":{"missingColumns":["region"]}}}
```
