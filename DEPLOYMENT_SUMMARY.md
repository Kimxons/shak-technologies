# KAIRO DOCKER ARCHITECTURE

## Current Deployment Architecture

```
                                    Internet
                                       │
                                       │ HTTPS (443)
                                       ↓
                        ╔══════════════════════════════╗
                        ║  kairo.craftsilicon.com      ║
                        ║  (Domain)                    ║
                        ╚══════════════════════════════╝
                                       │
                                       │
                        ┌──────────────┴───────────────┐
                        │   Linux Server                │
                        │   172.17.50.15                │
                        │                               │
                        │  ┌─────────────────────────┐  │
                        │  │  Nginx Reverse Proxy    │  │
                        │  │  (nginx-proxy)          │  │
                        │  │  Ports: 80, 443         │  │
                        │  │  SSL Termination        │  │
                        │  └──────────┬──────────────┘  │
                        │             │                  │
                        │  ┌──────────┴──────────────┐  │
                        │  │  Docker Network         │  │
                        │  │  (app-network)          │  │
                        │  │                          │  │
                        │  │  ┌────────────────────┐ │  │
                        │  │  │  kairo-ui          │ │  │
                        │  │  │  (.NET 9 Razor)    │ │  │
                        │  │  │  Port: 80 (int)    │ │  │
                        │  │  │  BFF/API Gateway   │ │  │
                        │  │  └─────────┬──────────┘ │  │
                        │  │            │             │  │
                        │  │  ┌─────────┼─────────┐  │  │
                        │  │  │         │         │  │  │
                        │  │  ↓         ↓         ↓  │  │
                        │  │                          │  │
                        │  │  Backend API Services:   │  │
                        │  │                          │  │
                        │  │  ┌──────────────────┐   │  │
                        │  │  │ iam-api          │   │  │
                        │  │  │ Port: 3309       │   │  │
                        │  │  │ (Auth Service)   │   │  │
                        │  │  └──────────────────┘   │  │
                        │  │                          │  │
                        │  │  ┌──────────────────┐   │  │
                        │  │  │ client-mgmt-api  │   │  │
                        │  │  │ Port: 3306       │   │  │
                        │  │  │ (.NET 9)         │   │  │
                        │  │  └──────────────────┘   │  │
                        │  │                          │  │
                        │  │  ┌──────────────────┐   │  │
                        │  │  │ account-mgmt-api │   │  │
                        │  │  │ Port: 3307       │   │  │
                        │  │  │ (.NET 9)         │   │  │
                        │  │  └──────────────────┘   │  │
                        │  │                          │  │
                        │  │  ┌──────────────────┐   │  │
                        │  │  │ systemcore-api   │   │  │
                        │  │  │ Port: 3311       │   │  │
                        │  │  │ (.NET 9) NEW!    │   │  │
                        │  │  └──────────────────┘   │  │
                        │  │                          │  │
                        │  │  ┌──────────────────┐   │  │
                        │  │  │ microfinance     │   │  │
                        │  │  │ Port: 3308       │   │  │
                        │  │  └──────────────────┘   │  │
                        │  │                          │  │
                        │  │  ┌──────────────────┐   │  │
                        │  │  │ client-doc-api   │   │  │
                        │  │  │ Port: 5102       │   │  │
                        │  │  └──────────────────┘   │  │
                        │  │                          │  │
                        │  │  ┌──────────────────┐   │  │
                        │  │  │ face-signature   │   │  │
                        │  │  │ Port: 5104       │   │  │
                        │  │  │ (Python/Flask)   │   │  │
                        │  │  └──────────────────┘   │  │
                        │  │            │             │  │
                        │  └────────────┼─────────────┘  │
                        │               │                 │
                        └───────────────┼─────────────────┘
                                        │
                                        │ TCP 3020
                                        ↓
                            ┌───────────────────────┐
                            │  SQL Server           │
                            │  172.16.2.42\SQL2022  │
                            │  Database: BRNET_TSEDEY│
                            └───────────────────────┘
```

---

## Port Mapping

| Service | Container Port | Host Port | Access |
|---------|---------------|-----------|--------|
| **nginx-proxy** | 80/443 | 80/443 | Public |
| **kairo-ui** | 80 | - | Internal only |
| **iam-api** | 80 | 3309 | Direct + Nginx |
| **iam-webclient** | 80 | 3310 | Direct |
| **client-management-api** | 80 | 3306 | Direct + Nginx |
| **account-management-api** | 80 | 3307 | Direct + Nginx |
| **systemcore-api** | 80 | 3311 | Direct + Nginx |
| **microfinance** | 80 | 3308 | Direct + Nginx |
| **client-document-api** | 80 | 5102 | Direct + Nginx |
| **face-signature** | 5000 | 5104 | Nginx only |

---

## Network Communication Flow

### External User Request:
```
Browser
  → https://kairo.craftsilicon.com:443 (Nginx)
  → http://kairo-ui:80 (Internal Docker Network)
  → http://account-management-api:80 (Internal)
  → SQL Server 172.16.2.42:3020
```

### API Request Flow:
```
kairo-ui
  │
  ├─→ http://iam-api:80/api (Authentication)
  ├─→ http://client-management-api:80/api (Client Data)
  ├─→ http://account-management-api:80/api (Account Data)
  ├─→ http://systemcore-api:80/api (System Config)
  └─→ http://client-document-api:80 (Documents)
```

---

## Security Layers

1. **SSL/TLS**: Nginx terminates SSL, internal traffic is HTTP
2. **Network Isolation**: Services communicate via internal Docker network
3. **Authentication**: JWT tokens validated by each API
4. **Database**: Encrypted credentials in environment variables
5. **CORS**: Restricted to kairo.craftsilicon.com

---

## Service Dependencies

```
┌─────────────────┐
│    kairo-ui     │ (Depends on ALL backend services)
└────────┬────────┘
         │
    ┌────┼────┬──────────┬─────────────┐
    ↓    ↓    ↓          ↓             ↓
┌────────┐ ┌──────┐ ┌─────────┐ ┌──────────┐
│iam-api │ │client│ │ account │ │systemcore│
│        │ │ mgmt │ │  mgmt   │ │          │
└────────┘ └──────┘ └─────────┘ └──────────┘
     │         │          │           │
     └─────────┴──────────┴───────────┘
                   │
              SQL Server
```

---

## Container Lifecycle

### Old Containers (TO BE REPLACED):
- ❌ `kairo_frontend` (Node.js)
- ❌ `client-maintenance` (Old .NET)
- ❌ `account-maintenance` (Old .NET)

### New Containers (DEPLOYED):
- ✅ `kairo-ui` (.NET 9)
- ✅ `client-management-api` (.NET 9)
- ✅ `account-management-api` (.NET 9)
- ✅ `systemcore-api` (.NET 9) **NEW**

### Unchanged Containers:
- ✅ `iam-api`
- ✅ `iam-webclient`
- ✅ `client-document-api`
- ✅ `face-signature-detection`
- ✅ `microfinance`
- ✅ `nginx-proxy`

---

## Configuration Files Created

| File | Purpose | Location |
|------|---------|----------|
| `kairo-ui/Dockerfile` | Build kairo-ui image | Local workspace |
| `AccountManagement/Dockerfile` | Build account API | Local workspace |
| `ClientManagement/Dockerfile` | Build client API | Local workspace |
| `SystemCoreApi/Dockerfile` | Build systemcore API | Local workspace |
| `docker-compose.final.yml` | Docker orchestration | Copy to server |
| `nginx.new.conf` | Nginx routing | Copy to server |
| `appsettings.Production.json` | Runtime config (per project) | Embedded in images |

---

## Environment Variables Summary

### kairo-ui:
```yaml
ApiSettings__IdentityAccessManagentBaseUrl: http://iam-api:80/api
ApiSettings__SystemCoreBaseUrl: http://systemcore-api:80/api
ApiSettings__ClientManagementBaseUrl: http://client-management-api:80/api
ApiSettings__AccountManagementBaseUrl: http://account-management-api:80/api
```

### All Backend APIs:
```yaml
AppSettings__DBServerName: 172.16.2.42\SQL2022,3020
AppSettings__DatabaseName: BRNET_TSEDEY
AppSettings__BRUserName: [Encrypted]
AppSettings__BRUserPassword: [Encrypted]
AppSettings__CORS: https://kairo.craftsilicon.com,http://kairo-ui:80
```

---

## Post-Deployment Checklist

- [ ] Run deployment script
- [ ] Verify all containers are "Up (healthy)"
- [ ] Test main UI: https://kairo.craftsilicon.com
- [ ] Test login functionality
- [ ] Test account search/view
- [ ] Test client search/view
- [ ] Check browser console for errors
- [ ] Monitor logs for 15 minutes
- [ ] Test API health endpoints
- [ ] Verify database connectivity

---

## 📞 Support Commands

### View all logs:
```bash
ssh kairo@172.17.50.15
cd /home/kairo/CoreBankingAPI
docker-compose logs -f
```

### Restart a service:
```bash
docker-compose restart [service-name]
```

### Check resource usage:
```bash
docker stats
```

### Enter container shell:
```bash
docker exec -it kairo-ui bash
```

---

**Ready to deploy?** Run `deploy-complete.sh` or `deploy-quick.bat`!
