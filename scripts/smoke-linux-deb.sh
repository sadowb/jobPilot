#!/usr/bin/env bash
# Installs the built .deb, checks its AppArmor profile, boots it with the Chromium sandbox on, then uninstalls.
# Runs before any sysctl change, so a passing boot proves the profile grants the user namespaces the sandbox needs.
set -euo pipefail
# A custom depends list replaces the defaults; check it still has them.
dpkg-deb -f release/*.deb Depends | grep -q libxtst6
sudo apt-get install -y ./release/*.deb
sudo apparmor_parser -QT /etc/apparmor.d/jobpilot
if sudo aa-status --enabled; then sudo aa-status | grep -q jobpilot; fi
xvfb-run -a dbus-run-session -- bash -c '
  mkdir -p ~/.local/share/keyrings
  echo ci | gnome-keyring-daemon --daemonize --unlock --components=secrets
  XDG_CURRENT_DESKTOP=GNOME node scripts/smoke-app.mjs /opt/JobPilot/jobpilot --password-store=gnome-libsecret
'
sudo apt-get remove -y jobpilot
test ! -e /etc/apparmor.d/jobpilot
