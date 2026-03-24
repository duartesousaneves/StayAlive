# MVP Requirements — Personal Finance Survival App

## 1. Objective
Provide immediate, actionable insight into whether a user can spend money without becoming insolvent before their next income.

Core question the app must answer:
> “If I spend X today, will I go negative in the next 30 days?”

---

## 2. Scope (MVP)

### Included
- CSV import (bank + credit card)
- Auto-detection of CSV structure
- Transaction normalization
- Auto-categorization (rule-based)
- Manual corrections
- Cash tracking (manual)
- Fixed expenses input
- Income events (manual)
- 30-day financial projection
- Spending simulation

### Excluded
- Bank APIs (PSD2)
- Mobile native apps
- Multi-currency
- ML-based categorization
- Notifications

---

## 3. User Flow

### Onboarding
1. User inputs next income (amount + date)
2. Upload CSV
3. Auto-detect structure
4. User confirms or adjusts mapping
5. Preview transactions
6. Auto-categorization
7. User corrects top ambiguous transactions
8. User adds fixed expenses

### First Output
- Current balance
- Lowest projected balance (30 days)
- Risk status
- Spending simulation input

### Daily Usage
- Quick check dashboard
- Add manual transactions (cash)
- Upload new CSVs
- Adjust income/fixed expenses

---

## 4. Data Model

### Account
- id
- type: checking | credit | cash

### Transaction
- id
- account_id
- date
- amount
- description
- normalized_description
- category_id
- affects_balance (boolean)
- hash (deduplication)

### Category
- id
- name
- type: fixed | variable

### IncomeEvent
- id
- amount
- expected_date

### FixedExpense
- id
- amount
- frequency
- next_date

---

## 5. CSV Processing

### 5.1 Auto-Detection (Primary Approach)

System attempts to infer:
- Header row (skip rows detection)
- Date column
- Amount column
- Description column

#### Heuristics:
- Detect column names using keyword matching:
  - date: ["data", "date"]
  - amount: ["valor", "amount"]
  - description: ["descrição", "description"]

- Detect header row by:
  - first row containing at least 2 recognized column names

- Detect account type:
  - if file contains "saldo" → checking
  - otherwise assume credit

---

### 5.2 Manual Mapping (Fallback)

User can override:
- date column
- amount column
- description column
- rows to skip

Mappings are saved per source.

---

### 5.3 Normalization

Output structure:

```
{
  date,
  amount,
  description,
  normalized_description,
  account_type,
  affects_balance
}
```

---

## 6. Transaction Rules

### Checking Account
- amount < 0 → expense → affects_balance = true
- amount > 0 → income → affects_balance = true

### Credit Card

#### Purchases
- amount > 0
- affects_balance = false

#### Credit Card Payment Detection
- description contains:
  - "PAGAMENTO CARTAO"

Rules:
- affects_balance = true
- treated as checking account impact

---

## 7. Description Normalization

### Strategy (Recommended)
Hybrid approach:

#### Step 1 — Uppercase + trim
#### Step 2 — Remove noise patterns (regex):
- IDs: `[A-Z0-9]{6,}`
- timestamps
- transaction codes

#### Step 3 — Keyword extraction
Maintain dictionary:

```
AMAZON → AMAZON
UBER → UBER
MB WAY → MBWAY
CONTINENTE → SUPERMARKET
```

#### Step 4 — Fallback
- first 2 meaningful words

---

## 8. Deduplication

Hash:
```
hash = date + amount + normalized_description
```

If hash exists → ignore transaction

---

## 9. Categorization

### Rule-based system

- Keyword → category mapping
- Historical reuse:
  - same normalized_description → same category

### Categories (fixed set)
- Rent
- Food
- Transport
- Subscriptions
- Debt
- Health
- Essentials
- Non-essential

---

## 10. Financial Engine

### Inputs
- Current balance
- Transactions (checking only affect balance)
- Credit card payments
- Fixed expenses
- Income events
- Variable spending average

---

### Variable Expense Calculation (Final Decision)

Daily average:

```
avg_daily = sum(last 90 days expenses) / 90
```

Applied daily in projection.

---

### Projection

- Horizon: 30 days
- Granularity: daily

For each day:
1. Start with previous balance
2. Apply:
   - fixed expenses (if due)
   - credit card payments
   - avg daily variable spend
   - income events

Output:
- daily balance array

---

## 11. Core Feature — Spending Simulation

Input:
- amount

Process:
- subtract from today’s balance
- recompute projection

Output:
- SAFE (never negative)
- RISK (negative at future date)
- UNSAFE (negative before next income)

---

## 12. UX Requirements

- Time to value < 5 minutes
- CSV upload + preview < 30 seconds
- Categorization correction < 2 minutes

Dashboard must show:
- current balance
- lowest projected balance
- critical date

---

## 13. Technical Stack

- Frontend: Next.js (PWA enabled)
- Backend: API routes / Supabase
- Database: PostgreSQL (Supabase)
- CSV parsing: PapaParse

---

## 14. Constraints

- Single checking account (MVP)
- Single currency (EUR)
- No offline requirement

---

## 15. Future Extensions (Not MVP)

- Multi-account support
- Credit card statement modeling
- Notifications
- Risk scoring
- Smart recommendations

---

## 16. Key Risks

- Incorrect CSV parsing
- Duplicate transactions
- Misclassification of credit card payments
- Poor description normalization

---

## 17. Success Criteria

User can:
- Upload CSV
- See projection
- Answer “can I spend X?”

Within 5 minutes of first use.

