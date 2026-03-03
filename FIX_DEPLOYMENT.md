# 🚨 DEPLOYMENT FIX REQUIRED

## ✅ What Was Completed Successfully:

1. ✅ All 4 Docker images built and pushed to Docker Hub
2. ✅ Configuration files transferred to server
3. ✅ New images pulled on server

## ❌ Issue Encountered:

The old containers (`core_banking_account`, `core_banking_client`, `kairo-frontend`) are still running and blocking ports 3306, 3307.

## 🔧 SOLUTION - Run These Commands on the Server:

### **Option 1: SSH Directly and Fix (Recommended)**

Open a terminal and run:

```bash
ssh kairo@172.17.50.15
```

**Enter password when prompted**, then execute:

```bash
cd /home/kairo/CoreBankingAPI

# Stop old containers
sudo docker stop core_banking_account core_banking_client kairo-frontend
sudo docker rm -f core_banking_account core_banking_client kairo-frontend

# Check if ports are free
sudo netstat -tulpn | grep -E ':(3306|3307)'

# Start new services
sudo docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api

# Restart nginx
sudo docker-compose restart nginx-proxy

# Wait 30 seconds
sleep 30

# Check status
sudo docker-compose ps

# Test health
curl http://localhost:3306/health
curl http://localhost:3307/health
curl http://localhost:3311/health

# Check logs for systemcore-api (it was restarting)
sudo docker-compose logs --tail=50 systemcore-api
```

### **Option 2: Using Screen or Separate SSH Session**

If you're already SSH'd into the server, just run:

```bash
cd /home/kairo/CoreBankingAPI

# Remove old containers
sudo docker stop core_banking_account core_banking_client kairo-frontend
sudo docker rm -f core_banking_account core_banking_client kairo-frontend

# Start new services
sudo docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api

# Wait and check
sleep 30
sudo docker-compose ps

# View logs
sudo docker-compose logs -f --tail=100 kairo-ui
```

---

## 🔍 Troubleshooting systemcore-api (Exit Code 150)

The systemcore-api container is restarting. After deployment, check its logs:

```bash
sudo docker-compose logs systemcore-api
```

**Common issues:**
1. Database connection failed
2. Missing appsettings.Production.json
3. Port conflict
4. Missing dependencies

**To fix:**

```bash
# Check if image has Production config
sudo docker run --rm jipheens/systemcore-api:latest ls -la /app/appsettings.Production.json

# Test database connectivity
sudo docker exec -it systemcore-api ping 172.16.2.42

# View full logs
sudo docker logs systemcore-api --tail=200
```

---

## 📊 Expected Final State:

```
NAME                       STATUS
kairo-ui                   Up (healthy)
client-management-api      Up (healthy)
account-management-api     Up (healthy)
systemcore-api             Up (healthy)
nginx-proxy                Up
iam-api                    Up (healthy)
iam-webclient              Up (healthy)
```

---

## ⚡ Quick One-Liner Fix:

```bash
ssh kairo@172.17.50.15 "cd /home/kairo/CoreBankingAPI && sudo docker stop core_banking_account core_banking_client kairo-frontend && sudo docker rm -f core_banking_account core_banking_client kairo-frontend && sudo docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api && sudo docker-compose restart nginx-proxy && sleep 30 && sudo docker-compose ps"
```

**Note:** You'll be prompted for:
1. SSH password
2. Sudo password (likely same as SSH password)

---

## 🎯 After Fix - Verify:

```bash
# On server, check all services
sudo docker-compose ps

# Test URLs from server
curl http://localhost:3306/health
curl http://localhost:3307/health
curl http://localhost:3311/health

# Test from browser
https://kairo.craftsilicon.com
```

---

## 📞 Need Help?

The images are ready on Docker Hub. You just need to:
1. SSH into server
2. Stop/remove old containers
3. Start new containers

**All files and images are ready!** Just need to clear the port conflicts.
