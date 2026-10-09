#!/usr/bin/env python3
"""The manual's build date, shown in the HTML sidebar, the card footers, the department
guides' subtitle and the Reference bundle.

It is the date of the last commit that changed the manual's CONTENT — src/, data/ or
diagrams/ — so an unchanged source builds to the same date (and a byte-identical
manual.json), and the date can never again be stuck at whatever someone last typed.
An uncommitted change to that content, or no git at all, means today. MANUAL_BUILT
overrides both (MM/DD/YYYY).
"""
import datetime, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = ("src", "data", "diagrams")


def built_date():
    if os.environ.get("MANUAL_BUILT"):
        return os.environ["MANUAL_BUILT"]
    try:
        git = lambda *a: subprocess.run(["git", *a, "--", *SOURCE], cwd=HERE, capture_output=True,
                                        text=True, check=True).stdout.strip()
        if not git("status", "--porcelain"):
            last = git("log", "-1", "--format=%cd", "--date=format:%m/%d/%Y")
            if last:
                return last
    except (OSError, subprocess.CalledProcessError):
        pass
    return datetime.date.today().strftime("%m/%d/%Y")


if __name__ == "__main__":
    print(built_date())
