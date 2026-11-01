#!/usr/bin/env bash
# Installs the LabTracker backup and health-check timers (deploy/systemd/*)
# for the current user and this checkout, after showing what it will do and
# asking. Re-run it after pulling changes to those unit files. Needs sudo.
#
#   deploy/install-systemd.sh            # install or update, then enable timers
#   deploy/install-systemd.sh --remove   # disable and remove them
set -euo pipefail
cd "$(dirname "$0")/.."

app_dir=$PWD
user=$(id -un)
units=(labtracker-backup.service labtracker-backup.timer labtracker-monitor.service
  labtracker-monitor.timer labtracker-alert@.service)

if [[ ${1:-} == --remove ]]; then
  sudo systemctl disable --now labtracker-backup.timer labtracker-monitor.timer || true
  for u in "${units[@]}"; do sudo rm -f "/etc/systemd/system/$u"; done
  sudo systemctl daemon-reload
  echo "Removed. /etc/labtracker and the backups are left alone."
  exit 0
fi

id -nG | grep -qw docker || { echo "$user must be in the docker group." >&2; exit 1; }
[[ -f .env.production ]] || { echo "Run this from a configured install (.env.production missing)." >&2; exit 1; }

cat <<EOF
This will:
  - write ${#units[@]} unit files to /etc/systemd/system, running as $user from $app_dir
  - create /etc/labtracker (owned by $user, mode 700) for offsite.env and alert.env
  - enable labtracker-backup.timer (nightly ~02:30) and labtracker-monitor.timer (every 10 min)
It does not run a backup, restart LabTracker, or touch its data.
EOF
read -r -p "Continue? [y/N] " answer
[[ $answer == [yY] ]] || { echo "Cancelled."; exit 1; }

for u in "${units[@]}"; do
  sed -e "s|@USER@|$user|g" -e "s|@APP_DIR@|$app_dir|g" "deploy/systemd/$u" \
    | sudo tee "/etc/systemd/system/$u" > /dev/null
done
sudo install -d -m 700 -o "$user" -g "$user" /etc/labtracker
sudo systemctl daemon-reload
sudo systemd-analyze verify /etc/systemd/system/labtracker-*.service /etc/systemd/system/labtracker-*.timer
sudo systemctl enable --now labtracker-backup.timer labtracker-monitor.timer

systemctl list-timers 'labtracker-*' --no-pager
id -nG | grep -qwE 'adm|systemd-journal' \
  || echo "Note: add $user to the adm group (sudo usermod -aG adm $user) so alerts can include log lines."
