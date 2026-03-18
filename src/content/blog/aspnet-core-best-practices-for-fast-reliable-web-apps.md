---
title: "ASP.NET Core Best Practices for Fast, Reliable Web Apps"
author: "Meshack Kitonga"
pubDatetime: 2026-03-18T10:00:00Z
featured: false
draft: false
tags:
  - aspnet-core
  - dotnet
  - performance
  - backend
  - csharp
description: "A practical guide to ASP.NET Core best practices that improve performance, reliability, and maintainability, based on current Microsoft guidance."
canonicalURL: ""
---

## Table of contents

## Introduction

ASP.NET Core is one of the strongest options for building modern web applications, APIs, and internal systems. It is fast, cross-platform, and production-ready, but strong performance does not happen by accident. Teams usually get the best results when they keep the request pipeline lean, shape queries carefully, cache the right things, and avoid expensive work on common code paths.

This post focuses on the practices that matter most in day-to-day ASP.NET Core work. It is not a list of random tweaks. It is a practical set of habits that help you ship web apps that are faster, easier to operate, and easier for other engineers to maintain.

## 1. Keep request handling asynchronous

One of the easiest ways to hurt an ASP.NET Core application is to block request threads with synchronous I/O. Microsoft recommends designing ASP.NET Core apps to process many requests at the same time by using asynchronous APIs end to end.

That means:

- avoid `.Result` and `.Wait()`
- do not wrap synchronous code in `Task.Run()` just to make it look asynchronous
- use async controller, minimal API, service, and repository methods consistently

A simple example:

```csharp
[HttpPost("/orders")]
public async Task<IResult> CreateOrder(CancellationToken cancellationToken)
{
    var request = await JsonSerializer.DeserializeAsync<CreateOrderRequest>(
        Request.Body,
        cancellationToken: cancellationToken
    );

    if (request is null)
    {
        return Results.BadRequest();
    }

    await _orderService.CreateAsync(request, cancellationToken);
    return Results.Accepted();
}
```

The goal is simple: if the framework gives you an async path, stay on it.

## 2. Do not return huge result sets

Large collections hurt both the server and the client. They increase memory use, serialization time, network cost, and page load time.

Instead of returning everything:

- paginate results
- use sensible page sizes
- stream or batch when the dataset is large
- consider keyset pagination when the user moves one page at a time

If a screen only shows 25 rows, do not send 5,000.

## 3. Query only the data you need

EF Core makes it easy to load full entities, but that convenience often pulls more data than the current request actually needs. Microsoft explicitly recommends projecting only the properties required for the current operation.

```csharp
var orders = await _db.Orders
    .Where(o => o.Status == OrderStatus.Open)
    .Select(o => new OrderListItem
    {
        Id = o.Id,
        CustomerName = o.Customer.Name,
        Total = o.Total,
        CreatedAt = o.CreatedAt
    })
    .ToListAsync(cancellationToken);
```

This is usually better than loading a full entity graph and trimming it later.

## 4. Make read-only queries cheaper

For read-heavy endpoints, use `AsNoTracking()` unless you truly need change tracking. Microsoft also recommends pushing filtering and aggregation to the database instead of pulling unnecessary rows into memory first.

```csharp
var recentOrders = await _db.Orders
    .AsNoTracking()
    .Where(o => o.CreatedAt >= cutoff)
    .OrderByDescending(o => o.CreatedAt)
    .Take(20)
    .Select(o => new RecentOrderDto(o.Id, o.Total, o.CreatedAt))
    .ToListAsync(cancellationToken);
```

Also be careful with lazy loading. It often creates hidden N+1 query problems. Prefer explicit includes, filtered includes, or projection when you know what the endpoint needs.

## 5. Cache intentionally, not blindly

Caching is still one of the best performance wins in ASP.NET Core, but only when the caching strategy matches the workload.

A practical way to think about it:

- use in-memory caching for single-instance or sticky-session scenarios
- use distributed caching when the app runs across multiple nodes
- use `HybridCache` when you want a simpler modern API with in-memory speed and distributed-cache durability
- use output caching for cacheable server responses

One important detail from Microsoft guidance: output caching is usually a better fit than response caching for UI apps because server configuration controls the cache behavior. Response caching is more useful for public `GET` or `HEAD` APIs that follow HTTP cache semantics.

Cache what is expensive and stable enough to reuse. Do not cache data that changes every few seconds unless the tradeoff is intentional.

## 6. Reuse outbound HTTP connections

If your app calls external APIs, do not create and dispose `HttpClient` manually on hot paths. ASP.NET Core guidance recommends using `IHttpClientFactory` so connection pooling is handled correctly and socket exhaustion is avoided.

```csharp
builder.Services.AddHttpClient<GitHubProfileClient>(client =>
{
    client.BaseAddress = new Uri("https://api.github.com/");
    client.DefaultRequestHeaders.Add("User-Agent", "Shak-Technologies");
});
```

This is one of those small choices that makes a real operational difference under load.

## 7. Compress responses and optimize client assets

Response size matters. Smaller payloads usually mean faster responses and better user experience.

Microsoft recommends:

- using server-based compression in IIS, Apache, or Nginx when possible
- using ASP.NET Core response compression middleware when hosting directly on Kestrel or HTTP.sys
- compressing text-based assets like HTML, CSS, JavaScript, JSON, and XML
- avoiding extra work on files that are already compressed, such as PNGs

This should also be paired with:

- minification
- bundling where appropriate
- a CDN for static assets when traffic or geography makes it worthwhile

## 8. Keep hot paths lean

Not all code paths matter equally. The most frequently executed ones deserve the most discipline.

In practice, this means:

- keep middleware small and predictable
- avoid unnecessary allocations in common paths
- minimize expensive serialization or mapping work
- watch for repeated authorization, logging, or helper logic running on every request

Performance problems usually come from the code that runs all the time, not the code that runs once in a while.

## 9. Move long-running work out of the request

An HTTP request should not sit around waiting for a long workflow to finish. Microsoft recommends moving long-running or CPU-heavy work outside ordinary request processing.

Good options include:

- background services
- queues
- message brokers
- Azure Functions or other out-of-process workers
- SignalR when clients need real-time updates

If the user only needs confirmation that work started, return early and finish the heavy part elsewhere.

## 10. Minimize exceptions on normal paths

Exceptions should represent unusual conditions, not ordinary control flow.

Throwing and catching exceptions is expensive compared to normal branching logic. If a condition is expected, check for it directly instead of relying on an exception to tell you what happened.

This is especially important in hot paths, where repeated exception handling can quietly drag performance down.

## 11. Centralize error handling and protect sensitive details

Every production ASP.NET Core app should have a consistent error-handling strategy. Use exception-handling middleware, return safe responses, and avoid leaking stack traces or sensitive system details to clients.

```csharp
builder.Services.AddProblemDetails();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
    app.UseHsts();
}
```

The key rule is simple: capture enough detail for operators and developers, but do not expose internals to end users or API consumers.

## 12. Use structured logging from day one

Logging is not just for debugging local issues. It is how you understand your application in production.

ASP.NET Core already gives you structured logging through `ILogger`, and the default app builder wires in common providers out of the box. Use that foundation well:

- log meaningful events, not noise
- include identifiers like user ID, request ID, tenant ID, or order ID when relevant
- keep log messages queryable and consistent
- send logs to a destination your team will actually monitor

Good logs shorten incident response time and make performance bottlenecks easier to spot.

## 13. Separate configuration by environment

Development, staging, and production do not need the same behavior. Microsoft documents environment-specific configuration for a reason.

In production, you usually want:

- caching enabled
- friendly error handling instead of developer exception pages
- stronger monitoring
- optimized client assets

Use environment-specific configuration files and environment variables to keep those concerns separate. Avoid hardcoding environment assumptions in the application.

## 14. Measure before and after each optimization

Not every optimization is worth the complexity it introduces. Microsoft explicitly notes this in several areas, including compiled queries and other advanced performance techniques.

So before committing to a “performance improvement”:

- identify the slow endpoint or query
- measure current behavior
- apply the change
- measure again

This keeps your codebase honest and avoids cargo-cult performance work.

## Closing Thoughts

The best ASP.NET Core applications are not built from tricks. They come from disciplined choices repeated over time: async request handling, efficient queries, deliberate caching, safe error handling, good logging, and a clean separation between fast request work and long-running background work.

If you get those decisions right early, the app is easier to scale, easier to debug, and easier to evolve.

That is what good ASP.NET Core engineering looks like in practice.

## References

1. [ASP.NET Core Best Practices - Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices?view=aspnetcore-9.0)
2. [Overview of Caching in ASP.NET Core - Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/overview?view=aspnetcore-9.0)
3. [Response Compression in ASP.NET Core - Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/performance/response-compression?view=aspnetcore-9.0)
4. [ASP.NET Core Runtime Environments - Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/environments?view=aspnetcore-9.0)
5. [Logging in .NET and ASP.NET Core - Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/logging/?view=aspnetcore-9.0)
6. [Handle Errors in ASP.NET Core - Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling?view=aspnetcore-9.0)
7. [Efficient Querying - EF Core - Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying)
