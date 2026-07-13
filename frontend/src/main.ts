import './app.css';

function showError(msg: string, detail?: string) {
  const el = document.getElementById('app');
  if (!el) return;
  el.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f9fafb;">
      <div style="max-width:480px;padding:32px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">&#x26A0;&#xFE0F;</div>
        <h2 style="margin:0 0 8px;color:#111827;font-size:18px;">应用启动失败</h2>
        <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">${msg}</p>
        ${detail ? `<p style="margin:8px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">${detail}</p>` : ''}
        <button onclick="location.reload()" style="margin-top:16px;padding:6px 16px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;">刷新重试</button>
      </div>
    </div>`;
}

// 兜底：Svelte 挂载前的致命错误
window.onerror = (_msg, _src, _line, _col, err) => {
  showError(String(err?.message || _msg), _src ? `${_src}:${_line}:${_col}` : undefined);
  return true;
};
window.onunhandledrejection = (e) => {
  showError(String(e.reason?.message || e.reason || '未知错误'));
};

try {
  const { mount } = await import('svelte');
  const { default: App } = await import('./App.svelte');
  mount(App, { target: document.getElementById('app')! });
} catch (e) {
  showError(
    (e as Error).message || '组件加载失败',
    (e as Error).stack?.split('\n').slice(0, 3).join('\n')
  );
}
