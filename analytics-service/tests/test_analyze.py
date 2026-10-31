import io

import pandas as pd

from app import analyze_dataframe, app


VALID_CSV = b"salesperson,revenue,region\nAlice,100,West\nBob,200,East\nAlice,50,West\n"


def client():
    app.config.update(TESTING=True)
    return app.test_client()


def upload(csv_bytes=VALID_CSV, filename="sales.csv"):
    return client().post(
        "/analyze",
        data={"file": (io.BytesIO(csv_bytes), filename)},
        content_type="multipart/form-data",
    )


def test_valid_csv_returns_summary_and_charts():
    response = upload()
    body = response.get_json()

    assert response.status_code == 200
    assert body["summary"]["rowCount"] == 3
    assert body["summary"]["totalRevenue"] == 350
    assert body["summary"]["topSalesperson"] == {"name": "Bob", "revenue": 200}
    assert body["summary"]["topRegion"] == {"name": "East", "revenue": 200}
    assert body["charts"]["revenueByRegion"]["layout"]["title"]["text"] == "Revenue by Region"
    assert body["charts"]["topSalespeople"]["layout"]["title"]["text"] == "Top Salespeople"


def test_header_case_and_whitespace_are_accepted():
    response = upload(b" SalesPerson , REVENUE , Region \nAlice,100, West \n")

    assert response.status_code == 200
    assert response.get_json()["summary"]["topRegion"]["name"] == "West"


def test_missing_column_reports_which_column_is_missing():
    response = upload(b"salesperson,revenue\nAlice,100\n")
    body = response.get_json()

    assert response.status_code == 400
    assert body["error"]["code"] == "MISSING_COLUMNS"
    assert body["error"]["details"]["missingColumns"] == ["region"]


def test_invalid_revenue_rows_are_dropped_and_reported():
    response = upload(b"salesperson,revenue,region\nAlice,not-a-number,West\nBob,200,East\n")
    body = response.get_json()

    assert response.status_code == 200
    assert body["summary"]["rowCount"] == 1
    assert body["warnings"] == ["Dropped 1 rows with non-numeric revenue"]


def test_empty_file_is_rejected():
    response = upload(b"", "empty.csv")

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "EMPTY_FILE"


def test_non_csv_extension_is_rejected():
    response = upload(VALID_CSV, "sales.txt")

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "INVALID_FILE_TYPE"


def test_missing_file_is_rejected():
    response = client().post("/analyze")

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "MISSING_FILE"


def test_oversize_file_is_rejected():
    response = upload(b"x" * (5 * 1024 * 1024 + 1), "large.csv")

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "FILE_TOO_LARGE"


def test_health():
    response = client().get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok", "service": "analytics-service"}


def test_analyze_dataframe_is_pure_and_testable():
    result = analyze_dataframe(
        pd.DataFrame(
            {
                "salesperson": ["Alice"],
                "revenue": [100],
                "region": ["West"],
            }
        )
    )

    assert result["summary"]["averageRevenue"] == 100
