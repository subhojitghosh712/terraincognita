#!/usr/bin/env python3
"""Create a project-local environment and install Uncharted's dependencies."""
import argparse
import json
from pathlib import Path
import platform
import subprocess
import sys
import venv

ROOT = Path(__file__).resolve().parents[1]
ENV_DIR = ROOT / '.venv'


def environment_python():
    return ENV_DIR / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')


def validate_platform(learn_only, *, version=None, system=None, machine=None, mac_version=None):
    version = version or sys.version_info[:2]
    if tuple(version) < (3, 12):
        raise RuntimeError('Python 3.12 or newer is required. Python 3.12 is the tested version.')
    if learn_only:
        return
    system = system or platform.system()
    machine = machine or platform.machine()
    if system != 'Darwin' or machine.lower() not in {'arm64', 'aarch64'}:
        raise RuntimeError(
            'Live inference requires an Apple Silicon Mac and native ARM Python. '
            'On other machines, run this command again with --learn-only. '
            'On an M-series Mac, use a native Python installation rather than Rosetta.')
    mac_version = mac_version or platform.mac_ver()[0]
    try:
        major = int(mac_version.split('.')[0])
    except (ValueError, IndexError):
        raise RuntimeError('Could not determine the macOS version; live inference requires macOS 14 or newer.')
    if major < 14:
        raise RuntimeError('Live inference requires macOS 14 or newer. Use --learn-only on this system.')


def run(command):
    subprocess.run([str(part) for part in command], cwd=ROOT, check=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--learn-only', action='store_true',
                        help='Install the lesson/web interface without MLX or model weights (any supported OS).')
    parser.add_argument('--skip-model', action='store_true',
                        help='Install full inference dependencies without downloading weights; useful when reusing an existing model.')
    args = parser.parse_args(argv)
    try:
        validate_platform(args.learn_only)
        if sys.version_info[:2] != (3, 12):
            print('Note: this project was tested with Python 3.12. Newer versions depend on package wheel availability.', flush=True)
        python = environment_python()
        if ENV_DIR.exists() and not python.is_file():
            raise RuntimeError('The .venv folder exists but has no usable Python. Rename it and rerun setup.')
        if not ENV_DIR.exists():
            print('Creating .venv inside this repository…', flush=True)
            venv.EnvBuilder(with_pip=True).create(ENV_DIR)

        info = json.loads(subprocess.check_output(
            [str(python), '-c',
             'import json,platform,sys; print(json.dumps({"version":list(sys.version_info[:2]),"system":platform.system(),"machine":platform.machine(),"mac_version":platform.mac_ver()[0]}))'],
            cwd=ROOT, text=True))
        validate_platform(args.learn_only, **info)
        requirement = ROOT / ('requirements-web.txt' if args.learn_only else 'requirements.txt')
        print(f'Installing {requirement.name} into .venv…', flush=True)
        run([python, '-m', 'pip', '--disable-pip-version-check', 'install', '-r', requirement])
        if not args.learn_only and not args.skip_model:
            print('Downloading the pinned four-bit model (about 3.1 GB)…', flush=True)
            run([python, ROOT / 'scripts/download_model.py'])
        marker = ROOT / '.learn-only'
        if args.learn_only:
            marker.write_text('Installed without local inference dependencies.\n', encoding='utf-8')
        else:
            marker.unlink(missing_ok=True)
        command = '.venv\\Scripts\\python.exe run.py' if sys.platform == 'win32' else '.venv/bin/python run.py'
        print(f'\nSetup complete. Start the app from this folder:\n  {command}', flush=True)
        if args.learn_only:
            print('Learn mode is selected. The real-model experiment is unavailable in this installation.', flush=True)
        elif args.skip_model:
            print('Model download skipped. Set UNCHARTED_MODEL_DIR to the existing pinned model directory, or run .venv/bin/python scripts/download_model.py before inference.', flush=True)
        if sys.platform == 'darwin':
            print('You can also double-click Start Uncharted.command.', flush=True)
        return 0
    except KeyboardInterrupt:
        print('\nSetup interrupted. Rerun the same command to continue.', file=sys.stderr)
        return 130
    except subprocess.CalledProcessError as exc:
        print(f'\nSetup stopped because a command failed (exit {exc.returncode}). Check the error above, then rerun setup. Python 3.12 is recommended.', file=sys.stderr)
        return 1
    except (OSError, RuntimeError, ValueError) as exc:
        print(f'\nSetup could not finish: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
