#nullable enable
using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;

namespace CarrotSwitch;

public partial class MainWindow : Window
{
    private Process? _serverProcess;
    private string _serverUrl = "";
    private readonly CancellationTokenSource _cts = new();

    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
        Closed += OnClosed;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            await StartServer();
            await WaitForServer();
            await InitializeWebView();
        }
        catch (Exception ex)
        {
            StatusText.Text = $"Error: {ex.Message}";
            LoadingText.Text = $"Failed to start: {ex.Message}";
        }
    }

    private Task StartServer()
    {
        var exeDir = AppDomain.CurrentDomain.BaseDirectory;
        var exePath = Path.Combine(exeDir, "carrot-switch.exe");

        // Fallback: look in parent directory (dev layout)
        if (!File.Exists(exePath))
            exePath = Path.Combine(Directory.GetParent(exeDir)?.FullName ?? exeDir, "carrot-switch.exe");

        if (!File.Exists(exePath))
            throw new FileNotFoundException(
                $"carrot-switch.exe not found. Expected at: {exePath}\n" +
                "Place the Bun-compiled exe next to this app or in the parent directory.");

        _serverProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = exePath,
                Arguments = "--no-browser",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            },
            EnableRaisingEvents = true,
        };

        _serverProcess.OutputDataReceived += (_, args) =>
        {
            if (args.Data != null && args.Data.Contains("http://"))
            {
                // Extract URL from "Carrot Switch server running at http://127.0.0.1:PORT"
                var idx = args.Data.IndexOf("http://");
                if (idx >= 0)
                {
                    _serverUrl = args.Data[idx..].TrimEnd('.', ' ', '\n', '\r');
                }
            }
        };

        _serverProcess.Start();
        _serverProcess.BeginOutputReadLine();
        _serverProcess.BeginErrorReadLine();

        StatusText.Text = "Server started, connecting...";
        return Task.CompletedTask;
    }

    private async Task WaitForServer()
    {
        // If URL already captured from stdout, use it
        if (string.IsNullOrEmpty(_serverUrl))
        {
            // Wait up to 10s for stdout to provide URL
            for (int i = 0; i < 100 && string.IsNullOrEmpty(_serverUrl); i++)
                await Task.Delay(100, _cts.Token);
        }

        // If still no URL, scan common ports
        if (string.IsNullOrEmpty(_serverUrl))
        {
            // The Bun server picks a random port; we need it from stdout
            // If stdout didn't capture it, the server may have failed
            throw new InvalidOperationException(
                "Could not determine server URL. Check if carrot-switch.exe started correctly.");
        }

        // Poll until server responds
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
        for (int i = 0; i < 50; i++)
        {
            try
            {
                var resp = await http.GetAsync(_serverUrl, _cts.Token);
                if ((int)resp.StatusCode < 500)
                {
                    StatusText.Text = $"Connected to {_serverUrl}";
                    return;
                }
            }
            catch
            {
                // Server not ready yet
            }
            await Task.Delay(200, _cts.Token);
        }

        throw new TimeoutException($"Server at {_serverUrl} did not respond in time.");
    }

    private async Task InitializeWebView()
    {
        await WebView.EnsureCoreWebView2Async();
        WebView.CoreWebView2.Navigate(_serverUrl);
        LoadingOverlay.Visibility = Visibility.Collapsed;
        Title = $"Carrot Switch - {_serverUrl}";
    }

    private void OnClosed(object? sender, EventArgs e)
    {
        _cts.Cancel();

        if (_serverProcess != null && !_serverProcess.HasExited)
        {
            try
            {
                _serverProcess.Kill(entireProcessTree: true);
                _serverProcess.WaitForExit(3000);
            }
            catch { }
        }

        _serverProcess?.Dispose();
        _cts.Dispose();
    }
}
