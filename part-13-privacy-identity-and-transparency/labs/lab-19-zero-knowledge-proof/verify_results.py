import subprocess
import sys
import unittest


def main() -> int:
    suite = unittest.defaultTestLoader.discover(".", pattern="test_*.py")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        return 1
    completed = subprocess.run(
        [sys.executable, "zk_proof.py"], check=True, capture_output=True, text=True
    )
    required = {"valid=True", "tampered_valid=False", "recovered_secret=7"}
    missing = required - set(completed.stdout.splitlines())
    if missing:
        print(f"missing expected results: {sorted(missing)}", file=sys.stderr)
        return 1
    print("Result verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
