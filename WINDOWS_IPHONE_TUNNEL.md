# 📱 iPhone USB Tunnel Setup for Windows

## Step 1: Install libimobiledevice on Windows

**Option A: Using Chocolatey (Recommended)**
```powershell
# Install Chocolatey if you don't have it:
# Run PowerShell as Administrator, then:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install libimobiledevice
choco install libimobiledevice
```

**Option B: Download Pre-built Binary**
1. Download from: https://github.com/libimobiledevice-win32/libimobiledevice-win32/releases
2. Extract and add to PATH
3. Or run `iproxy.exe` directly from the extracted folder

**Option C: Using Scoop**
```powershell
scoop install libimobiledevice
```

## Step 2: Connect iPhone and Run Tunnel

1. **Connect iPhone 13 to Windows laptop via USB**
2. **Unlock iPhone and trust the computer** (if prompted)
3. **Open PowerShell or Command Prompt** (any directory works)
4. **Run:**
   ```powershell
   iproxy 2222 22
   ```
   Or if using the .exe:
   ```powershell
   iproxy.exe 2222 22
   ```

5. **Keep this window open** - the tunnel stays active while running

## Step 3: Verify Connection

On the remote Mac, check if iPhone appears:
```bash
xcrun xctrace list devices
```

## Troubleshooting

**If `iproxy` command not found:**
- Make sure libimobiledevice is installed
- Add it to your PATH, or use full path to `iproxy.exe`
- Try: `C:\Program Files\libimobiledevice\bin\iproxy.exe 2222 22`

**If iPhone not detected:**
- Make sure iPhone is unlocked
- Check USB cable connection
- Try different USB port
- On iPhone: Settings → General → Reset → Reset Location & Privacy (if needed)

**If tunnel doesn't work:**
- Make sure Tailscale is connected on both machines
- Check firewall isn't blocking port 2222
- Try restarting `iproxy`

## Quick Command Reference

```powershell
# Check if iPhone is detected
idevice_id -l

# Start tunnel (run from ANY directory)
iproxy 2222 22

# Stop tunnel: Press Ctrl+C
```


