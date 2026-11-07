#!/bin/zsh
set -eu
app_dir="${0:A:h}"
python_bin="$app_dir/.venv/bin/python"
if [[ ! -x "$python_bin" ]]; then
  print 'The project environment is missing.'
  print 'Open Terminal in this folder and run: python3.12 scripts/setup.py'
  print 'For the lesson without model inference, add --learn-only. See README.md.'
  read 'reply?Press Return to close.'
  exit 1
fi
cd "$app_dir"
print 'Starting Uncharted. Keep this Terminal window open.'
print 'Press Control-C here to stop the server and release memory.'
"$python_bin" "$app_dir/run.py" "$@" || {
  result=$?
  print 'Uncharted could not start. Read the message above and README.md.'
  read 'reply?Press Return to close.'
  exit "$result"
}
