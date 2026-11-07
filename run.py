"""Start Terra Incognita locally without depending on the current working directory."""
import argparse
import os
from pathlib import Path
import platform
import socket
import threading
import time
import urllib.error
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description='Run the local Terra Incognita app.')
    parser.add_argument('--learn-only', action='store_true', help='Open the lesson without loading a model (any supported OS).')
    parser.add_argument('--port', type=int, default=8765, help='Local port (default: 8765).')
    parser.add_argument('--no-browser', action='store_true', help='Do not automatically open a browser.')
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error('--port must be between 1 and 65535')
    return args


def open_when_ready(url, landing):
    for _ in range(120):
        try:
            with urllib.request.urlopen(f'{url}/api/status', timeout=1) as response:
                if response.status == 200:
                    webbrowser.open(landing)
                    return
        except (OSError, urllib.error.URLError):
            time.sleep(0.5)


def main(argv=None):
    args = parse_args(argv)
    learning_only = args.learn_only or (ROOT / '.learn-only').is_file() or os.environ.get('TERRA_INCOGNITA_LEARN_ONLY') == '1' or os.environ.get('UNCHARTED_LEARN_ONLY') == '1'
    if learning_only:
        os.environ['TERRA_INCOGNITA_LEARN_ONLY'] = '1'
        os.environ['UNCHARTED_LEARN_ONLY'] = '1'
    try:
        import uvicorn
    except ImportError:
        raise SystemExit('Dependencies are missing. Run python3.12 scripts/setup.py (or add --learn-only), then use the .venv Python.') from None
    with socket.socket() as probe:
        try:
            probe.bind(('127.0.0.1', args.port))
        except OSError:
            raise SystemExit(f'Port {args.port} is already in use. Close the previous server or run with --port {args.port + 1 if args.port < 65535 else 8765}.') from None
    # server.py reads the learning-only setting on import.
    from server import app
    url = f'http://127.0.0.1:{args.port}'
    landing = f'{url}/#learn' if learning_only else url
    print(f'Terra Incognita: {landing}', flush=True)
    print('Keep this terminal open. Press Ctrl-C to stop.', flush=True)
    if not args.no_browser:
        threading.Thread(target=open_when_ready, args=(url, landing), daemon=True).start()
    uvicorn.run(app, host='127.0.0.1', port=args.port, workers=1, log_level='info')


if __name__ == '__main__':
    main()
