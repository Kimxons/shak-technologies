---
title: "Deploying Django on DigitalOcean App Platform: A Step-by-Step Guide"
author: "Meshack Kitonga"
pubDatetime: 2025-01-21T20:20:36Z
slug: deploy-django-on-digitalocean
featured: true
draft: false
tags:
  - django
  - digitalocean
  - deployment
description: "A comprehensive guide to deploying your Django application on DigitalOcean's App Platform."
canonicalURL: ""
---

## Table of contents

## Introduction

Deploying a web application can often be a complex process, but with DigitalOcean's App Platform, it becomes much more manageable.
In this guide, I will walk through the steps to deploy a Django application on DigitalOcean, ensuring that you have a scalable and robust web app ready for production.

## Why Choose DigitalOcean App Platform for Django?

1. **Ease of Use**  
   DigitalOcean's App Platform simplifies the deployment process, allowing developers to focus on building applications rather than managing infrastructure.

2. **Automatic Scaling**  
   The platform automatically scales your application based on traffic, ensuring optimal performance without manual intervention.

3. **Integrated Database Support**  
   You can easily integrate PostgreSQL and other databases with your Django application.

4. **Continuous Deployment**  
   Connect your GitHub repository for seamless updates and continuous deployment.

5. **Robust Security Features**  
   DigitalOcean provides various security features to protect your applications and data.

## Prerequisites

Before you begin, ensure you have the following:

- A **DigitalOcean account** (sign up at [digitalocean.com](https://www.digitalocean.com/))
- **GitHub repository** for your Django project
- Basic knowledge of Django and Git

## Step 1: Creating Your Django Project

First, create a new Django project:

```python
django-admin startproject myproject
cd myproject
```

Then create a new app within your project

```python
python manage.py startapp myapp
```

Make sure to add your app to the `INSTALLED_APPS` list in `myproject/settings.py`:

```python
INSTALLED_APPS = [
...
'myapp',
]
```

## Step 2: Setting Up DigitalOcean App Platform

1. **Log in to DigitalOcean** and navigate to the App Platform dashboard.
2. Click on **"Launch App"**.
3. Connect your GitHub account and select the repository containing your Django project.
4. Configure the app settings such as app name, region, and branch for deployment.

## Step 3: Configuring Environment Variables

To securely manage sensitive data like database credentials:

1. Click on **Edit** next to the Environment Variables section.
2. Add necessary variables such as:

```python
DEBUG=True
DJANGO_ALLOWED_HOSTS=${APP_DOMAIN}
DATABASE_URL=${DATABASE_URL}
```

You also need to modify Run Command

Change the default run command to point to your WSGI application, e.g.,
bash

```bash
gunicorn --worker-tmp-dir /dev/shm mysite.wsgi
Replace mysite with your project's name.
```

## Step 4: Deploying Your Application

After configuring your settings:

1. Review all configurations.
2. Choose a plan (Basic or Pro) based on your needs.
3. Click on **Launch App** to start the deployment process.

DigitalOcean will build and deploy your application automatically.

## Step 5: Finalizing Setup

Once deployment is complete, access the console tab in the dashboard and run migrations:

```python
python manage.py migrate
python manage.py createsuperuser
```

This sets up your database and creates an admin user for managing your application.

## Conclusion

Congratulations! You have successfully deployed your Django application on DigitalOcean's App Platform. This platform not only simplifies the deployment process but also provides robust features to ensure your application runs smoothly in production.

If you found this guide helpful, feel free to share it with others who might benefit from deploying their own Django applications!

Happy coding!
