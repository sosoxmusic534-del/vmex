import hashlib
import hmac
import secrets
import time
import pyotp
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Callable


class SecureMethod(Enum):
    RECOVERY_CODE = "recovery_code"
    PASSWORD_2FA = "password_2fa"
    OTP = "otp"


class AuthError(Exception):
    pass


@dataclass
class AccountRecord:
    username: str
    password_hash: str
    salt: bytes
    totp_secret: Optional[str] = None
    recovery_codes: list = field(default_factory=list)
    used_recovery: set = field(default_factory=set)
    otp_channel: Optional[str] = None
    otp_ttl: int = 300
    failed_attempts: int = 0
    locked_until: float = 0.0
    _pending_otp: dict = field(default_factory=dict)


class SecureMinecraftAccount:
    """
    Auto-secure pipeline for Minecraft account auth.
    Supports: Recovery Code | Password + 2FA | OTP
    """

    MAX_FAILS = 5
    LOCKOUT_SECONDS = 900

    def __init__(self, pepper: bytes):
        self._pepper = pepper
        self._db: dict[str, AccountRecord] = {}
        self._audit: list[tuple[float, str, str]] = []

    # ---------- internal helpers ----------

    def _log(self, user: str, event: str):
        self._audit.append((time.time(), user, event))

    def _hash(self, password: str, salt: bytes) -> str:
        return hashlib.scrypt(
            password.encode(),
            salt=salt + self._pepper,
            n=2 ** 14, r=8, p=1, dklen=64
        ).hex()

    def _check_lock(self, rec: AccountRecord):
        if rec.locked_until and time.time() < rec.locked_until:
            raise AuthError(f"locked out for {int(rec.locked_until - time.time())}s")
        if rec.locked_until and time.time() >= rec.locked_until:
            rec.locked_until = 0.0
            rec.failed_attempts = 0

    def _fail(self, rec: AccountRecord):
        rec.failed_attempts += 1
        if rec.failed_attempts >= self.MAX_FAILS:
            rec.locked_until = time.time() + self.LOCKOUT_SECONDS
            self._log(rec.username, "auto_lockdown_triggered")
        else:
            self._log(rec.username, "auth_fail")

    # ---------- registration ----------

    def register(self, username: str, password: str, otp_channel: Optional[str] = None):
        if username in self._db:
            raise AuthError("username taken")
        salt = secrets.token_bytes(16)
        rec = AccountRecord(
            username=username,
            password_hash=self._hash(password, salt),
            salt=salt,
            totp_secret=pyotp.random_base32(),
            otp_channel=otp_channel
        )
        rec.recovery_codes = [secrets.token_urlsafe(12) for _ in range(8)]
        self._db[username] = rec
        self._log(username, "registered")
        return rec.recovery_codes

    # ---------- method 1: recovery code ----------

    def auth_recovery(self, username: str, code: str) -> bool:
        rec = self._get(username)
        self._check_lock(rec)
        if code in rec.recovery_codes and code not in rec.used_recovery:
            rec.used_recovery.add(code)
            rec.failed_attempts = 0
            self._log(username, "auth_ok_recovery")
            return True
        self._fail(rec)
        return False

    # ---------- method 2: password + 2FA ----------

    def auth_password_2fa(self, username: str, password: str, totp_code: str) -> bool:
        rec = self._get(username)
        self._check_lock(rec)
        pw_ok = hmac.compare_digest(rec.password_hash, self._hash(password, rec.salt))
        totp_ok = pyotp.TOTP(rec.totp_secret).verify(totp_code, valid_window=1)
        if pw_ok and totp_ok:
            rec.failed_attempts = 0
            self._log(username, "auth_ok_password_2fa")
            return True
        self._fail(rec)
        return False

    # ---------- method 3: OTP ----------

    def issue_otp(self, username: str) -> str:
        rec = self._get(username)
        otp = f"{secrets.randbelow(10 ** 6):06d}"
        rec._pending_otp[otp] = time.time() + rec.otp_ttl
        self._log(username, "otp_issued")
        return otp

    def auth_otp(self, username: str, otp: str) -> bool:
        rec = self._get(username)
        self._check_lock(rec)
        expiry = rec._pending_otp.get(otp)
        if expiry and time.time() < expiry:
            del rec._pending_otp[otp]
            rec.failed_attempts = 0
            self._log(username, "auth_ok_otp")
            return True
        self._fail(rec)
        return False

    # ---------- auto-secure dispatcher ----------

    def auto_secure(self, username: str, method: SecureMethod, **creds) -> bool:
        """
        One entry point. Route by method, auto-enforce lockout + audit.
        """
        dispatcher: dict[SecureMethod, Callable[..., bool]] = {
            SecureMethod.RECOVERY_CODE: lambda: self.auth_recovery(
                username, creds["code"]),
            SecureMethod.PASSWORD_2FA: lambda: self.auth_password_2fa(
                username, creds["password"], creds["totp"]),
            SecureMethod.OTP: lambda: self.auth_otp(
                username, creds["otp"]),
        }
        if method not in dispatcher:
            raise AuthError("unsupported method")
        try:
            return dispatcher[method]()
        except KeyError as e:
            raise AuthError(f"missing cred: {e}") from e

    def _get(self, username: str) -> AccountRecord:
        rec = self._db.get(username)
        if not rec:
            raise AuthError("no such account")
        return rec


# -------- demo --------
if __name__ == "__main__":
    vault = SecureMinecraftAccount(pepper=secrets.token_bytes(32))
    codes = vault.register("Notch", "hunter2", otp_channel="email")

    print("recovery:", vault.auto_secure("Notch", SecureMethod.RECOVERY_CODE, code=codes[0]))
    print("pw+2fa :", vault.auto_secure("Notch", SecureMethod.PASSWORD_2FA,
                                        password="hunter2",
                                        totp=pyotp.TOTP(vault._db["Notch"].totp_secret).now()))
    otp = vault.issue_otp("Notch")
    print("otp    :", vault.auto_secure("Notch", SecureMethod.OTP, otp=otp))