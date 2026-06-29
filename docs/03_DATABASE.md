# Database Schema Specification - MoneyMind AI

This document specifies the tables and fields for the relational database (SQLite for development) used to store user settings, transaction lists, budgets, goals, and billing schedules.

---

## 1. Tables

### 1.1 `users`
Stores user profile information, income details, and primary savings targets.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique ID |
| `username` | VARCHAR(100) | UNIQUE, NOT NULL | Login username |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | User email address |
| `hashed_password`| VARCHAR(255) | NOT NULL | BCrypt hashed password |
| `monthly_income` | FLOAT | DEFAULT 0.0 | User's net monthly income |
| `savings_goal` | FLOAT | DEFAULT 0.0 | Target monthly savings amount |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Timestamp of creation |

### 1.2 `accounts`
Holds the user's financial accounts (cash, credit cards, bank accounts).
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique account ID |
| `user_id` | INTEGER | FOREIGN KEY (`users.id`) | Owner's user ID |
| `name` | VARCHAR(100) | NOT NULL | Account name (e.g. "Chase Checking") |
| `type` | VARCHAR(50) | NOT NULL | Account type (`checking`, `savings`, `credit`) |
| `balance` | FLOAT | DEFAULT 0.0 | Current account balance |

### 1.3 `transactions`
Relational store of transaction history.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique transaction ID |
| `user_id` | INTEGER | FOREIGN KEY (`users.id`) | Associated user |
| `account_id` | INTEGER | FOREIGN KEY (`accounts.id`) | Associated account |
| `amount` | FLOAT | NOT NULL | Amount (positive for debit, negative for credit) |
| `merchant` | VARCHAR(100) | NOT NULL | Merchant name (e.g. "Amazon") |
| `category` | VARCHAR(100) | NOT NULL | e.g. "Food", "Entertainment", "Utilities" |
| `date` | DATE | NOT NULL | Date of transaction |
| `type` | VARCHAR(20) | NOT NULL | `debit` or `credit` |
| `sentiment` | VARCHAR(20) | DEFAULT "Neutral" | Emotional evaluation (`Happy`, `Neutral`, `Regret`) |
| `note` | TEXT | NULL | Custom notes |

### 1.4 `budgets`
Tracks budget limits by category.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique budget ID |
| `user_id` | INTEGER | FOREIGN KEY (`users.id`) | Owner's user ID |
| `category` | VARCHAR(100) | NOT NULL | Budget category |
| `limit_amount` | FLOAT | NOT NULL | Budget limit amount |
| `current_spending`| FLOAT | DEFAULT 0.0 | Running category spending for the month |

### 1.5 `goals`
Tracks target milestones (e.g., buying a laptop, vacation).
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique goal ID |
| `user_id` | INTEGER | FOREIGN KEY (`users.id`) | Associated user |
| `name` | VARCHAR(100) | NOT NULL | Goal name (e.g., "Emergency Fund") |
| `target_amount` | FLOAT | NOT NULL | Target sum |
| `current_amount` | FLOAT | DEFAULT 0.0 | Amount saved so far |
| `target_date` | DATE | NOT NULL | Target date for completion |
| `status` | VARCHAR(50) | DEFAULT "Active" | `Active`, `Completed`, `Delayed` |

### 1.6 `bills`
Tracks upcoming obligations, subscriptions, and SIP investments.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique bill ID |
| `user_id` | INTEGER | FOREIGN KEY (`users.id`) | Associated user |
| `name` | VARCHAR(100) | NOT NULL | Bill name (e.g., "Netflix Subscription") |
| `amount` | FLOAT | NOT NULL | Cost |
| `due_date` | DATE | NOT NULL | Next due date |
| `is_recurring` | BOOLEAN | DEFAULT TRUE | True for subscription/SIP |
| `interval` | VARCHAR(50) | DEFAULT "monthly" | `monthly`, `weekly`, `yearly` |
| `status` | VARCHAR(50) | DEFAULT "Unpaid" | `Unpaid`, `Paid` |

---

## 2. Relationships
1. **User (1) -> (Many) Accounts**: A user can register multiple checking/credit accounts.
2. **User (1) -> (Many) Transactions**: A user has a ledger of transactions.
3. **Account (1) -> (Many) Transactions**: Transactions are tied to specific payment modes.
4. **User (1) -> (Many) Budgets, Goals, Bills**: Budgets, financial goals, and bills are user-specific.
