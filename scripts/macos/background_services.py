#!/usr/bin/env python3
"""Install or remove per-user launchd services for the local web app."""

import argparse
import os
import plistlib
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LAUNCH_AGENTS = Path.home() / "Library" / "LaunchAgents"
LOG_DIR = Path.home() / "Library" / "Logs" / "OptionJournal"
DOMAIN = f"gui/{os.getuid()}"

SERVICES = (
    {
        "label": "com.optionjournal.prevent-sleep",
        "program": "caffeinate",
        "arguments": ["-i"],
        "working_directory": ROOT,
    },
    {
        "label": "com.optionjournal.backend",
        "program": "php",
        "arguments": ["artisan", "serve", "--host=127.0.0.1", "--port=8000"],
        "working_directory": ROOT / "backend",
    },
    {
        "label": "com.optionjournal.frontend",
        "program": "node",
        "arguments": [
            str(ROOT / "frontend" / "node_modules" / "vite" / "bin" / "vite.js"),
            "--host",
            "0.0.0.0",
            "--port",
            "3000",
            "--strictPort",
        ],
        "working_directory": ROOT / "frontend",
    },
)


def launchctl(*arguments: str) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["/bin/launchctl", *arguments],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        details = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"launchctl {' '.join(arguments)} failed: {details}")
    return result


def is_loaded(label: str) -> bool:
    result = subprocess.run(
        ["/bin/launchctl", "print", f"{DOMAIN}/{label}"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode == 0:
        return True
    if "Could not find service" not in result.stderr:
        details = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"Could not inspect launchd service {label}: {details}")
    return False


def unload_if_loaded(label: str) -> None:
    if is_loaded(label):
        launchctl("bootout", f"{DOMAIN}/{label}")


def install() -> None:
    if sys.platform != "darwin":
        raise RuntimeError("Background services can only be installed on macOS.")

    LAUNCH_AGENTS.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    for service in SERVICES:
        executable = shutil.which(service["program"])
        if not executable:
            raise RuntimeError(f"Could not find {service['program']} in PATH.")
        if not service["working_directory"].is_dir():
            raise RuntimeError(f"Missing directory: {service['working_directory']}")

        arguments = service["arguments"]
        if service["program"] == "php" and not (ROOT / "backend" / "artisan").is_file():
            raise RuntimeError("Laravel entry point not found at backend/artisan.")
        if service["program"] == "node" and not Path(arguments[0]).is_file():
            raise RuntimeError(
                "Vite is not installed. Run `npm install` in the frontend directory first."
            )

        label = service["label"]
        plist_path = LAUNCH_AGENTS / f"{label}.plist"
        log_path = LOG_DIR / f"{label}.log"
        plist = {
            "Label": label,
            "ProgramArguments": [executable, *arguments],
            "WorkingDirectory": str(service["working_directory"]),
            "RunAtLoad": True,
            "KeepAlive": True,
            "ThrottleInterval": 10,
            "StandardOutPath": str(log_path),
            "StandardErrorPath": str(log_path),
        }

        if plist_path.is_file():
            with plist_path.open("rb") as file:
                installed_plist = plistlib.load(file)
            if installed_plist == plist and is_loaded(label):
                print(f"Already installed and running {label}")
                continue

        unload_if_loaded(label)
        with plist_path.open("wb") as file:
            plistlib.dump(plist, file)
        launchctl("bootstrap", DOMAIN, str(plist_path))
        print(f"Installed and started {label}")

    print("Services will stay running after VS Code closes and start at your next login.")
    print("The Mac can be screen-locked; idle system sleep is prevented while you are logged in.")
    print("Closing the lid, manually sleeping, logging out, or losing Wi-Fi will make it unreachable.")
    print("On another device on the same Wi-Fi, open http://<MAC-IP>:3000")
    print("Find the Mac's current Wi-Fi IP with: ipconfig getifaddr en0")
    print(f"Logs: {LOG_DIR}")


def uninstall() -> None:
    if sys.platform != "darwin":
        raise RuntimeError("Background services can only be removed on macOS.")

    for service in SERVICES:
        label = service["label"]
        unload_if_loaded(label)
        plist_path = LAUNCH_AGENTS / f"{label}.plist"
        if plist_path.exists():
            plist_path.unlink()
        print(f"Removed {label}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=("install", "uninstall"),
        help="Install/start services or stop/remove them.",
    )
    args = parser.parse_args()
    try:
        install() if args.action == "install" else uninstall()
    except (OSError, RuntimeError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
