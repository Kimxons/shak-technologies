# 🎨 BUILD DASHBOARD - USER GUIDE

## 🚀 **HOW TO USE**

### **Starting the Dashboard:**

**Option 1 - Double-Click (Easiest):**
```
Double-click: START_BUILD_DASHBOARD.bat
```

**Option 2 - PowerShell:**
```powershell
.\start-build-dashboard.ps1
```

---

## 📊 **Dashboard Features**

### **1. Service Selection**
- Click on any service card to select/deselect it
- Use "Select All" to select all services
- Use "Clear All" to deselect all services

### **2. Build Process**
- Click "🔨 Build Selected" to start building
- Watch real-time progress with:
  - Progress bar showing completion percentage
  - Live log output showing build status
  - Stats showing total/completed/current service

### **3. Real-Time Feedback**
- ✅ Green messages = Success
- 🔨 Blue messages = In Progress
- ❌ Red messages = Errors
- ⚠️ Yellow messages = Warnings

---

## 🎯 **Typical Workflow**

### **Scenario 1: Changed Frontend Only**
1. Start dashboard: `START_BUILD_DASHBOARD.bat`
2. Click on "kairo-ui" card
3. Click "🔨 Build Selected"
4. Wait for completion
5. Deploy on server using the command shown in logs

### **Scenario 2: Changed Multiple Services**
1. Start dashboard
2. Click "Select All" OR select specific services
3. Click "🔨 Build Selected"
4. Wait for all builds to complete
5. Deploy on server

### **Scenario 3: Quick Test Build**
1. Start dashboard
2. Select one service
3. Build it
4. Check logs for any errors before deploying

---

## 🖥️ **Dashboard Components**

### **Service Cards:**
- 🎨 **kairo-ui** - Frontend (Razor Pages, .NET 9)
- 💼 **Account API** - Account Management (.NET 8)
- 👥 **Client API** - Client Management (.NET 8)
- ⚙️ **SystemCore API** - Core Services (.NET 8)

### **Stats:**
- **Total** - Number of services selected for build
- **Completed** - Number of services built successfully
- **Current** - Service currently being built

### **Progress Bar:**
- Shows overall completion percentage
- Updates in real-time as each service completes

### **Log Output:**
- Live terminal output
- Color-coded messages
- Auto-scrolls to show latest messages

---

## 📝 **What the Dashboard Does**

For each selected service:

1. **Build Phase:**
   - Runs: `docker build -f <dockerfile> -t <image> .`
   - Shows real-time build progress
   - Captures any errors

2. **Push Phase:**
   - Runs: `docker push <image>`
   - Uploads to Docker Hub
   - Confirms successful push

3. **Completion:**
   - Shows success/failure status
   - Updates stats
   - Provides next steps

---

## ⚡ **Advantages Over Scripts**

✅ **Visual Interface** - See all services at a glance

✅ **Selective Builds** - Build only what changed

✅ **Real-Time Progress** - Watch builds happen live

✅ **Error Visibility** - Immediate feedback on failures

✅ **No Command Line** - Click and go!

✅ **Multi-Build Support** - Queue multiple services

---

## 🔧 **Technical Details**

### **Server:**
- **URL:** http://localhost:8888
- **Port:** 8888 (configurable in `start-build-dashboard.ps1`)
- **Backend:** PowerShell HTTP listener
- **Auto-opens:** Browser launches automatically

### **Build Process:**
- Builds run sequentially (one at a time)
- Each build is isolated
- Full Docker output captured
- Errors are highlighted

### **Docker Commands:**
```bash
# Build
docker build -f <dockerfile> -t <image> .

# Push
docker push <image>
```

---

## 🚨 **Troubleshooting**

### **Dashboard Won't Open:**
```powershell
# Check if port 8888 is in use
netstat -ano | findstr "8888"

# Change port in start-build-dashboard.ps1 if needed
$port = 9999  # Use different port
```

### **Build Fails:**
- Check log output in dashboard for specific error
- Common issues:
  - Docker not running
  - Not logged into Docker Hub
  - File paths incorrect

### **Can't Push to Docker Hub:**
```powershell
# Login to Docker Hub
docker login

# Enter credentials:
# Username: jipheens
# Password: <your-password>
```

### **Server Won't Stop:**
- Press `Ctrl+C` in the PowerShell window
- Or close the window
- Or run:
  ```powershell
  Stop-Process -Name "pwsh" -Force
  ```

---

## 💡 **Pro Tips**

### **Tip 1: Keep Dashboard Open**
- Leave it running during development
- Rebuild as needed without restarting server

### **Tip 2: Watch the Logs**
- Log output shows exact Docker commands
- Use for debugging build issues
- Copy commands to run manually if needed

### **Tip 3: Build Order**
- Backend APIs can be built in any order
- Frontend (kairo-ui) can be built independently

### **Tip 4: Incremental Builds**
- Docker caches layers
- Rebuilds are faster if only code changed
- Full rebuild only when dependencies change

---

## 📋 **After Building**

### **Deploy on Server:**

Once dashboard shows "✅ All builds completed!", deploy on server:

```bash
# SSH into server
ssh kairo@172.17.50.15

# Navigate to directory
cd /home/kairo/CoreBankingAPI

# Pull and deploy specific service
bash quick-deploy.sh kairo-ui

# OR deploy all services
sudo docker-compose pull
sudo docker-compose up -d --force-recreate
```

---

## 🎯 **Keyboard Shortcuts**

- **Refresh Dashboard:** `F5`
- **Stop Server:** `Ctrl+C` (in PowerShell window)
- **Copy Log Text:** Select and `Ctrl+C`

---

## 📦 **Files Used**

| File | Purpose |
|------|---------|
| `START_BUILD_DASHBOARD.bat` | Easy launcher |
| `start-build-dashboard.ps1` | PowerShell server |
| `build-dashboard.html` | Web interface |

---

## 🔄 **Workflow Comparison**

### **Old Way (Scripts):**
1. Open PowerShell
2. Type command
3. Wait (no visual feedback)
4. Check if successful
5. Repeat for each service

**Time:** 10-15 minutes

### **New Way (Dashboard):**
1. Double-click `START_BUILD_DASHBOARD.bat`
2. Click services to build
3. Click "Build Selected"
4. Watch progress in real-time
5. Done!

**Time:** 5-8 minutes

---

## 🎉 **Quick Start**

```
1. Double-click: START_BUILD_DASHBOARD.bat
2. Wait for browser to open
3. Select services
4. Click "Build Selected"
5. Watch the magic happen! ✨
```

---

**Enjoy your new build dashboard!** 🚀

For questions or issues, refer to:
- `BUILD_AND_DEPLOY.md` - Build documentation
- `WORKFLOW_GUIDE.md` - Detailed workflows
- `QUICK_REFERENCE.txt` - Command reference
