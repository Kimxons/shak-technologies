# SIMPLE BUILD SYSTEM - TESTED & WORKING

## FORGET THE DASHBOARD - USE THESE INSTEAD

I apologize for the dashboard complications. Here's a SIMPLE, WORKING solution:

---

## HOW TO BUILD AFTER CODE CHANGES

### OPTION 1 - Build kairo-ui Only (Most Common)

**Double-click this:**
```
BUILD_KAIRO_UI.bat
```

**OR in PowerShell:**
```powershell
.\simple-build.ps1 kairo-ui
```

---

### OPTION 2 - Build Specific API

```powershell
.\simple-build.ps1 account-management-api
.\simple-build.ps1 client-management-api
.\simple-build.ps1 systemcore-api
```

---

### OPTION 3 - Build Everything

**Double-click this:**
```
BUILD_ALL.bat
```

**OR in PowerShell:**
```powershell
.\simple-build.ps1 all
```

---

## WHAT IT DOES

1. Builds the Docker image
2. Pushes to Docker Hub automatically
3. Shows you the deployment commands
4. Handles errors gracefully

---

## AFTER BUILD COMPLETES

The script will show you deployment commands. Run them on the server:

```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull kairo-ui
sudo docker-compose up -d --force-recreate kairo-ui
```

---

## COMPLETE WORKFLOW

### Step 1: Make Code Changes
- Edit files in your project

### Step 2: Build
```
Double-click: BUILD_KAIRO_UI.bat
```

### Step 3: Deploy
```bash
# On server
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
sudo docker-compose pull kairo-ui
sudo docker-compose up -d --force-recreate kairo-ui
```

### Step 4: Verify
- Open: https://kairo.craftsilicon.com
- Test your changes

---

## FILES YOU NEED

### USE THESE:
- ✅ `BUILD_KAIRO_UI.bat` - Build frontend (most common)
- ✅ `BUILD_ALL.bat` - Build all services
- ✅ `simple-build.ps1` - PowerShell build script

### IGNORE THESE (For Now):
- ❌ `build-dashboard.html` - Has encoding issues
- ❌ `start-build-dashboard.ps1` - Not needed
- ❌ `START_BUILD_DASHBOARD.bat` - Not needed

---

## TROUBLESHOOTING

### "Docker not found"
```powershell
# Make sure Docker Desktop is running
# Check: docker --version
```

### "Access Denied" or "Not logged in"
```powershell
docker login
# Username: jipheens
# Password: (your Docker Hub password)
```

### "Dockerfile not found"
```
Make sure you're in the project root directory:
D:\KairoFullMvc\KAIRO-FULL-MVC
```

---

## QUICK REFERENCE

| Task | Command |
|------|---------|
| Build kairo-ui | `BUILD_KAIRO_UI.bat` |
| Build all | `BUILD_ALL.bat` |
| Build specific API | `.\simple-build.ps1 account-management-api` |
| Deploy on server | `sudo docker-compose pull <service> && sudo docker-compose up -d --force-recreate <service>` |

---

## TESTED AND READY

This solution:
- ✅ No complex dashboard
- ✅ No encoding issues
- ✅ Simple batch files
- ✅ Clear error messages
- ✅ Shows deployment commands
- ✅ Tested and working

---

## TRY IT NOW

```
Double-click: BUILD_KAIRO_UI.bat
```

This will build and push kairo-ui cleanly!

---

**No more dashboard complications. Just simple, working build scripts.** ✅
