import db from "./db.js";
import { HttpError } from "./errors.js";

const getBalance = db.prepare("SELECT balance FROM users WHERE id = ?");
const addBalance = db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?");
const insertTx = db.prepare(
  "INSERT INTO credit_transactions (user_id, amount, balance_after, type, note) VALUES (?, ?, ?, ?, ?)"
);

/**
 * Change a user's balance and log it.
 * Safe to call inside db.transaction(...).
 */
export function changeCredit(userId, amount, type, note = "") {
  const row = getBalance.get(userId);
  if (!row) throw new HttpError(404, "User not found.");

  const after = row.balance + amount;
  if (after < 0) throw new HttpError(400, `Not enough balance (current LKR ${row.balance}).`);

  addBalance.run(amount, userId);
  insertTx.run(userId, amount, after, type, String(note).slice(0, 160));
  return after;
}
