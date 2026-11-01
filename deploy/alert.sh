#!/usr/bin/env bash
# Run by systemd when a LabTracker unit fails (labtracker-alert@<unit>.service,
# via OnFailure=). Writes the failure to the journal and, if ALERT_URL is set in
# $ALERT_ENV, POSTs a short plain-text message there (works with ntfy topics
# and Healthchecks.io /fail URLs). The same unit alerts at most once per
# $ALERT_REPEAT_H hours; its next successful run resets that.
set -euo pipefail

unit=${1:?usage: alert.sh <failed unit>}
ALERT_ENV=${ALERT_ENV:-/etc/labtracker/alert.env}
ALERT_REPEAT_H=${ALERT_REPEAT_H:-6}
state_dir=${ALERT_STATE_DIR:-/var/lib/labtracker}
stamp="$state_dir/alert-$unit"

if [[ -f $stamp ]] && (( ($(date +%s) - $(stat -c %Y "$stamp")) < ALERT_REPEAT_H * 3600 )); then
  echo "$unit failed again; already alerted within ${ALERT_REPEAT_H}h."
  exit 0
fi

details=$(journalctl -u "$unit" -n 12 --no-pager -o cat 2> /dev/null || true)
message="LabTracker on $(hostname): $unit failed at $(date '+%Y-%m-%d %H:%M %Z').
${details:-(no journal access; see: journalctl -u $unit)}"
echo "$message"

if [[ -r $ALERT_ENV ]]; then
  # shellcheck source=/dev/null
  ALERT_URL=$(. "$ALERT_ENV"; echo "${ALERT_URL:-}")
  if [[ -n $ALERT_URL ]]; then
    curl -fsS -m 15 --retry 2 -o /dev/null -H "Title: LabTracker: $unit failed" \
      --data-binary "$message" "$ALERT_URL" || echo "warning: could not deliver alert to ALERT_URL" >&2
  fi
fi
touch "$stamp"
