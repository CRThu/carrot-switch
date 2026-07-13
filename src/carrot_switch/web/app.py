"""FastAPI app + pywebview lifecycle."""
import socket
import threading
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from carrot_switch.web.api import router


def create_app() -> FastAPI:
    application = FastAPI(title="Carrot Switch")
    application.include_router(router)
    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        application.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
    return application


app = create_app()


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def run():
    port = _find_free_port()

    def start_server():
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

    thread = threading.Thread(target=start_server, daemon=True)
    thread.start()

    import webview
    webview.create_window(
        "Carrot Switch",
        f"http://127.0.0.1:{port}",
        width=900,
        height=700,
    )
    webview.start()


if __name__ == "__main__":
    run()
