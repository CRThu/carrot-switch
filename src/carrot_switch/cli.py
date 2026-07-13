"""CLI entry point for carrot-switch."""
import sys
from carrot_switch.web.app import run


def main():
    run()


if __name__ == "__main__":
    sys.exit(main() or 0)
