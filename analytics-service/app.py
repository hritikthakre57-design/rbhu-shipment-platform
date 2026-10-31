from __future__ import annotations

import json
import logging
import os
from typing import Any

import pandas as pd
import plotly.express as px
from flask import Flask, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

MAX_FILE_SIZE = 5 * 1024 * 1024
REQUIRED_COLUMNS = {"salesperson", "revenue", "region"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE


class AnalyticsValidationError(Exception):
    def __init__(self, code: str, message: str, details: Any = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details


def error_response(status: int, code: str, message: str, details: Any = None):
    error: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    return jsonify({"error": error}), status


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    normalized.columns = [str(column).strip().lower() for column in normalized.columns]
    return normalized


def _figure_json(figure) -> dict[str, Any]:
    return json.loads(figure.to_json())


def analyze_dataframe(df: pd.DataFrame) -> dict[str, Any]:
    """Validate and summarize a sales dataframe without depending on Flask."""
    data = _normalize_columns(df)
    missing = sorted(REQUIRED_COLUMNS - set(data.columns))
    if missing:
        raise AnalyticsValidationError(
            "MISSING_COLUMNS",
            "Required columns are missing",
            {"missingColumns": missing},
        )

    data["salesperson"] = data["salesperson"].astype("string").str.strip()
    data["region"] = data["region"].astype("string").str.strip()
    data["revenue"] = pd.to_numeric(data["revenue"], errors="coerce")

    warnings: list[str] = []
    invalid_revenue = int(data["revenue"].isna().sum())
    if invalid_revenue:
        warnings.append(f"Dropped {invalid_revenue} rows with non-numeric revenue")

    blank_text = (
        data["salesperson"].isna()
        | data["region"].isna()
        | data["salesperson"].eq("")
        | data["region"].eq("")
    )
    blank_text_count = int(blank_text.sum())
    if blank_text_count:
        warnings.append(f"Dropped {blank_text_count} rows with blank salesperson or region")

    data = data.loc[~blank_text & data["revenue"].notna(), ["salesperson", "revenue", "region"]]
    if data.empty:
        raise AnalyticsValidationError("NO_VALID_ROWS", "The CSV contains no valid sales rows")

    region_totals = (
        data.groupby("region", as_index=False)["revenue"]
        .sum()
        .sort_values("revenue", ascending=False)
    )
    salesperson_totals = (
        data.groupby("salesperson", as_index=False)["revenue"]
        .sum()
        .sort_values("revenue", ascending=False)
    )
    top_salespeople = salesperson_totals.head(5)

    revenue_by_region = px.bar(
        region_totals,
        x="region",
        y="revenue",
        title="Revenue by Region",
    )
    top_salespeople_chart = px.bar(
        top_salespeople,
        x="salesperson",
        y="revenue",
        title="Top Salespeople",
    )

    top_person = salesperson_totals.iloc[0]
    top_region = region_totals.iloc[0]
    return {
        "summary": {
            "rowCount": int(len(data)),
            "totalRevenue": float(data["revenue"].sum()),
            "averageRevenue": float(data["revenue"].mean()),
            "medianRevenue": float(data["revenue"].median()),
            "topSalesperson": {
                "name": str(top_person["salesperson"]),
                "revenue": float(top_person["revenue"]),
            },
            "topRegion": {
                "name": str(top_region["region"]),
                "revenue": float(top_region["revenue"]),
            },
        },
        "charts": {
            "revenueByRegion": _figure_json(revenue_by_region),
            "topSalespeople": _figure_json(top_salespeople_chart),
        },
        "warnings": warnings,
    }


@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(_error):
    return error_response(413, "FILE_TOO_LARGE", "CSV file must be 5 MB or smaller")


@app.errorhandler(Exception)
def handle_unexpected(error):
    logger.exception("Unhandled analytics error", exc_info=error)
    return error_response(500, "INTERNAL_ERROR", "Something went wrong")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "analytics-service"})


@app.post("/analyze")
def analyze():
    uploaded = request.files.get("file")
    if uploaded is None:
        return error_response(400, "MISSING_FILE", "A CSV file is required")
    if not uploaded.filename:
        return error_response(400, "EMPTY_FILE", "The uploaded file has no filename")
    if not uploaded.filename.lower().endswith(".csv"):
        return error_response(400, "INVALID_FILE_TYPE", "Only .csv files are accepted")

    try:
        frame = pd.read_csv(uploaded.stream)
    except pd.errors.EmptyDataError:
        return error_response(400, "EMPTY_FILE", "The CSV file is empty")
    except (pd.errors.ParserError, UnicodeDecodeError, ValueError):
        return error_response(400, "INVALID_CSV", "The file could not be parsed as CSV")

    try:
        return jsonify(analyze_dataframe(frame))
    except AnalyticsValidationError as error:
        return error_response(400, error.code, error.message, error.details)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    host = os.environ.get("HOST", "0.0.0.0")
    app.run(host=host, port=port, debug=False)
