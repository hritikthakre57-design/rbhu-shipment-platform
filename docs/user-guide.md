# Shipflow Operations User Guide

Shipflow is a shipment operations workspace for managing customers, tracking shipments, reviewing live dashboard metrics, analyzing sales data, and asking questions through the operations assistant.

This guide explains the application from a user’s perspective. It is written for the current local/demo application.

## 1. Getting started

### Open the application

For the local assessment environment, open:

```text
http://localhost:5173
```

The browser application requires the backend and analytics service to be running. If the page cannot load data, see [Troubleshooting](#10-troubleshooting).

### Demo login

The seeded development account is:

```text
Email:    admin@example.com
Password: Admin@123
```

These credentials are for local development/demo use only. They must not be used as production credentials.

### Sign in

1. Open the application URL.
2. Enter your email address.
3. Enter your password.
4. Select **Sign in**.
5. After successful authentication, the Dashboard opens automatically.

Invalid credentials or incomplete fields display an error message on the login form.

## 2. Application layout

### Desktop navigation

On desktop, the left sidebar provides access to:

- **Dashboard** — operational totals and shipment status distribution.
- **Customers** — customer directory and customer management.
- **Shipments** — shipment register and status updates.
- **Analytics** — CSV-based sales analysis.
- **Assistant** — questions about customers, shipments, and dashboard totals.

The signed-in user and **Log out** control are shown at the bottom of the sidebar.

### Mobile navigation

On smaller screens:

1. Select the menu button in the top-left corner.
2. Select the required section.
3. The navigation drawer closes automatically after selecting a section.

Select the close button or the shaded area outside the drawer to close it without changing pages.

## 3. Dashboard

The Dashboard is the operational overview of the platform. Its values are loaded from the backend and are not static demo numbers.

### Dashboard cards

The dashboard displays:

- **Total customers** — active customers in the platform.
- **Total shipments** — all shipments recorded by the platform.
- **In transit** — shipments currently moving through the network.
- **Delivered** — shipments that have reached a delivered state.

Each card indicates that the value comes from live platform data.

### Shipment status distribution

The pipeline section shows the number and percentage of shipments in each status:

- Created
- InTransit
- Delivered
- Cancelled

The progress bars are calculated from the current shipment totals. The Pipeline health panel shows the percentage of shipments currently delivered.

### Refresh behavior

The Dashboard is refreshed when relevant customer or shipment changes occur. It also refreshes after a shipment status notification is received through the live connection.

## 4. Customer management

Open **Customers** from the navigation.

### Customer list

The customer table shows:

- Customer name
- Email address
- Company
- Active/Inactive status
- Available actions

Use the **Filter status** control to display all customers, only Active customers, or only Inactive customers.

### Add a customer

1. Select **Add customer**.
2. Enter the customer’s **Name**.
3. Enter the customer’s **Email**.
4. Enter the **Company**.
5. Select the customer **Status**.
6. Select **Save**.

The new customer appears in the table after the save succeeds.

Required validation includes:

- Name is required.
- Email must be a valid email address.
- Company is required.
- Name and company are limited to 100 characters.
- Status must be Active or Inactive.

Email addresses are normalized for case and surrounding spaces. An email already used by another customer produces a duplicate-email error.

### Edit a customer

1. Locate the customer in the table.
2. Select **Edit**.
3. Change the required fields.
4. Select **Save**.

The table refreshes after a successful update.

### Delete a customer

1. Locate the customer.
2. Select **Delete**.
3. Confirm the browser confirmation dialog.

Customer deletion is a soft delete. The customer is removed from normal lists, but the underlying record is retained for data history. Its email remains reserved and cannot immediately be reused.

## 5. Shipment management

Open **Shipments** from the navigation.

### Shipment list

The shipment table shows:

- Tracking number
- Customer and company
- Origin and destination
- Current status
- Status update control

Use the **Filter status** control to filter by Created, InTransit, Delivered, or Cancelled.

### Create a shipment

1. Select **New shipment**.
2. Enter a unique **Tracking number**.
3. Select an active **Customer**.
4. Enter the **Origin**.
5. Enter the **Destination**.
6. Select **Create shipment**.

New shipments start with the **Created** status.

Validation includes:

- Tracking number must be at least 3 characters and no more than 50 characters.
- A customer must be selected.
- Origin and destination are required and limited to 100 characters.
- The tracking number must be unique.

If the tracking number already exists, the shipment is not created and an error is displayed in the form.

### Change a shipment status

1. Find the shipment in the table.
2. Open its status dropdown.
3. Select the new status.

The update is saved immediately. The table, Dashboard, and other connected users are refreshed after a successful change.

### Shipment status rules

| Status | Meaning | Can be changed? |
|---|---|---|
| Created | Shipment has been created but has not started transit | Yes, while not final |
| InTransit | Shipment is moving between origin and destination | Yes, while not final |
| Delivered | Shipment has been delivered | No; final status |
| Cancelled | Shipment has been cancelled | No; final status |

Changing a shipment to its existing status is rejected. Delivered and Cancelled shipments have disabled status controls.

Shipments do not have a delete action. Use the business status, including Cancelled where appropriate, instead of deleting shipment history.

## 6. Real-time shipment notifications

The application opens an authenticated WebSocket connection after login.

### Notification center

The notification bell is shown beside the Shipflow brand in the sidebar. On mobile, it is available inside the navigation drawer.

- A red badge shows the number of unread shipment notifications.
- Select the bell to open the recent notification panel.
- Opening the panel marks the displayed notifications as read.
- The panel keeps the latest 20 notifications for the current signed-in session.
- Select **Clear all** to remove the notification history from the current session.
- If there are no events, the panel displays **No recent notifications**.

When any connected user successfully changes a shipment status:

1. All connected application clients receive a notification.
2. A toast appears with the shipment ID and new status.
3. The Shipments list is invalidated and refreshed.
4. Dashboard totals and status distribution are invalidated and refreshed.

Example notification message:

```json
{
  "event": "shipment_status_changed",
  "shipmentId": "12345",
  "status": "Delivered"
}
```

If the connection is interrupted, the frontend attempts to reconnect with increasing delays. Logging out closes the connection.

## 7. Sales analytics

Open **Analytics** from the navigation.

### Prepare a CSV file

The CSV must contain these columns:

```text
salesperson,revenue,region
```

Example:

```csv
salesperson,revenue,region
Alice,12500,West
Bob,9800,East
Alice,4200,West
```

Column names are normalized for case and surrounding spaces. The upload must be a `.csv` file and no larger than 5 MB.

### Analyze a file

1. Open **Analytics**.
2. Select **Choose a CSV file**.
3. Select the CSV file from your computer.
4. Confirm the selected filename is shown.
5. Select **Analyze**.

The results include:

- Rows analyzed
- Total revenue
- Average revenue
- Median revenue
- Top salesperson
- Top region
- Revenue by Region chart
- Top Salespeople chart

### Data warnings and errors

The service reports warnings when it drops rows with:

- Non-numeric revenue.
- A blank salesperson.
- A blank region.

The upload is rejected when:

- No file is selected.
- The file is not CSV.
- The file is empty or cannot be parsed.
- Required columns are missing.
- The file exceeds 5 MB.
- No valid sales rows remain.

## 8. AI Assistant

Open **Assistant** from the navigation.

The assistant can answer questions about:

- Shipment tracking numbers.
- Shipment statuses.
- Shipment origins and destinations.
- Customer and shipment totals.
- Dashboard status counts.

### Ask a question

1. Open **Assistant**.
2. Type a question in the message box.
3. Select **Send**.

The conversation displays user messages on the right and assistant responses on the left. Conversation history is stored and loaded again when the conversation is reopened.

Example questions:

```text
What is the status of TRK-1001?
How many shipments are in transit?
How many customers do we have?
Where is TRK-1002 going?
```

### Start a new conversation

Select **New chat**. The current conversation is cleared from the assistant view and a new conversation can begin.

### Demo mode

If the configured AI provider is unavailable or no provider key is configured, the assistant uses a clearly labelled Demo mode fallback. Demo replies use platform data available to the application but are not generated by the external AI provider.

The assistant is instructed not to invent shipment or customer facts and to refuse unrelated requests politely.

## 9. Sign out

Select **Log out** from the desktop sidebar or mobile navigation drawer.

Signing out:

- Removes the local login session.
- Closes the real-time shipment connection.
- Returns the browser to the login page.

## 10. Troubleshooting

### The login page does not open

- Confirm the frontend is running at `http://localhost:5173`.
- Refresh the browser.
- Check that the frontend development server is using port 5173.

### Login fails with valid demo credentials

- Confirm the backend is running at `http://localhost:4000`.
- Confirm the seeded demo user exists.
- Check the backend console for database or environment configuration errors.

### Dashboard shows an error

- Refresh the page.
- Confirm the backend health endpoint responds at `http://localhost:4000/health`.
- Confirm the browser still has an authenticated session.

### Customers or shipments do not load

- Check the backend service.
- Refresh the page.
- Confirm the session has not expired.
- Review the error message shown on the page.

### Analytics upload fails

- Confirm the file extension is `.csv`.
- Confirm the file contains `salesperson`, `revenue`, and `region` columns.
- Confirm the file is no larger than 5 MB.
- Confirm the Flask analytics service is running at `http://127.0.0.1:5001`.

### The assistant shows Demo mode

This means the configured AI provider is unavailable or no provider key is configured. The assistant remains usable for demo responses based on current platform data.

### Live notifications do not arrive

- Confirm the user is logged in.
- Refresh the application to create a new WebSocket connection.
- Confirm the backend WebSocket route is available through `/ws`.
- Check whether a browser or network proxy is blocking WebSockets.

## 11. Local operator reference

The application is composed of three services:

| Service | Local address | Purpose |
|---|---|---|
| Frontend | `http://localhost:5173` | React user interface |
| Backend | `http://localhost:4000` | Authentication, APIs, database access, WebSocket notifications |
| Analytics | `http://127.0.0.1:5001` | Private Flask CSV processing service |

The backend Swagger UI is available at:

```text
http://localhost:4000/api-docs
```

The health endpoints are:

```text
http://localhost:4000/health
http://127.0.0.1:5001/health
```

For developer setup and service commands, refer to the repository README and the service-specific README files.

## 12. Important limitations

- The seeded login is for local/demo use and is not a production identity system.
- Production authentication is designed to use Microsoft Entra ID, but the local application uses JWT authentication.
- The local application stores the JWT in browser localStorage.
- WebSocket broadcasting is implemented for one backend instance. Multi-instance fan-out requires Redis, Azure Web PubSub, or a similar service.
- Customers use soft delete; deleted customer email addresses remain reserved.
- Shipments cannot be deleted; status history is preserved through the shipment record.
- Customer and shipment lists do not currently provide pagination.
- Analytics PNG export is not available in the current application.
- Azure deployment is documented as an architecture design; the local repository is not evidence of a deployed Azure environment.

## 13. Quick daily workflow

1. Sign in.
2. Review Dashboard totals and shipment pipeline.
3. Add or update customers in Customers.
4. Create shipments in Shipments.
5. Update shipment statuses as orders move through the network.
6. Watch for live status notifications.
7. Upload sales data in Analytics when a performance view is needed.
8. Ask the Assistant about current shipment or dashboard information.
9. Log out when finished.
