using kairo_ui.Models.Dashboard;
using kairo_ui.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace kairo_ui.Attributes
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
    public sealed class ResourcePrivilegeAttribute : TypeFilterAttribute
    {
        public ResourcePrivilegeAttribute(string resourceId, string scope)
            : base(typeof(ResourcePrivilegeFilter))
        {
            Arguments = new object[] { resourceId, scope };
        }

        public ResourcePrivilegeAttribute(short resourceId, string scope)
            : this(resourceId.ToString(), scope)
        {
        }
    }

    internal sealed class ResourcePrivilegeFilter : IAsyncAuthorizationFilter
    {
        private const string RolesSessionKey = "roles";
        private const string ResourcesSessionKey = "resources";
        private static readonly char[] ScopeSeparators = new[] { ':', '.', '|', '/', '-', '_' };

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        private readonly string _resourceId;
        private readonly string _scope;
        private readonly IAuthService _authService;
        private readonly ILogger<ResourcePrivilegeFilter> _logger;

        public ResourcePrivilegeFilter(
            string resourceId,
            string scope,
            IAuthService authService,
            ILogger<ResourcePrivilegeFilter> logger)
        {
            _resourceId = resourceId ?? string.Empty;
            _scope = scope ?? string.Empty;
            _authService = authService;
            _logger = logger;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            if (!_authService.IsAuthenticated())
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            if (string.IsNullOrWhiteSpace(_resourceId) || string.IsNullOrWhiteSpace(_scope))
            {
                context.Result = new ForbidResult();
                return;
            }

            var rolesJson = context.HttpContext.Session.GetString(RolesSessionKey);
            if (string.IsNullOrWhiteSpace(rolesJson))
            {
                _logger.LogWarning("[ResourcePrivilege] No roles found in session");
                context.Result = new ForbidResult();
                return;
            }

            var resources = await GetResourcesAsync(context.HttpContext, rolesJson);
            var hasPrivilege = HasPrivilege(resources);

            if (!hasPrivilege)
            {
                _logger.LogWarning("[ResourcePrivilege] Access denied for resource {ResourceId} with scope {Scope}", _resourceId, _scope);
                context.Result = new ForbidResult();
            }
        }

        private bool HasPrivilege(List<string> resources)
        {
            if (resources == null || resources.Count == 0)
            {
                return false;
            }

            var resourceOnlyMatch = false;
            var actionMatchFound = false;

            foreach (var entry in resources)
            {
                if (string.IsNullOrWhiteSpace(entry))
                {
                    continue;
                }

                var trimmed = entry.Trim();

                if (string.Equals(trimmed, _resourceId, StringComparison.OrdinalIgnoreCase))
                {
                    resourceOnlyMatch = true;
                    continue;
                }

                foreach (var separator in ScopeSeparators)
                {
                    var index = trimmed.IndexOf(separator);
                    if (index <= 0 || index >= trimmed.Length - 1)
                    {
                        continue;
                    }

                    var left = trimmed.Substring(0, index).Trim();
                    var right = trimmed.Substring(index + 1).Trim();

                    if (string.IsNullOrEmpty(left) || string.IsNullOrEmpty(right))
                    {
                        continue;
                    }

                    if (string.Equals(left, _resourceId, StringComparison.OrdinalIgnoreCase))
                    {
                        actionMatchFound = true;
                        if (string.Equals(right, _scope, StringComparison.OrdinalIgnoreCase))
                        {
                            return true;
                        }
                    }
                }
            }

            if (actionMatchFound)
            {
                return false;
            }

            return resourceOnlyMatch;
        }

        private async Task<List<string>> GetResourcesAsync(HttpContext httpContext, string rolesJson)
        {
            var cachedResources = httpContext.Session.GetString(ResourcesSessionKey);
            if (!string.IsNullOrWhiteSpace(cachedResources))
            {
                try
                {
                    return JsonSerializer.Deserialize<List<string>>(cachedResources, JsonOptions) ?? new List<string>();
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "[ResourcePrivilege] Failed to parse cached resources");
                    httpContext.Session.Remove(ResourcesSessionKey);
                }
            }

            var roles = JsonSerializer.Deserialize<List<string>>(rolesJson, JsonOptions) ?? new List<string>();
            if (roles.Count == 0)
            {
                return new List<string>();
            }

            try
            {
                var roleNames = string.Join(",", roles);
                var endpoint = $"api/role/resources?roleNames={Uri.EscapeDataString(roleNames)}";
                var response = await _authService.GetSingleAsync<RoleResourcesResponse>(endpoint);
                var resources = response?.Resources ?? new List<string>();

                // Cache resources in session to avoid repeated API calls per request.
                httpContext.Session.SetString(ResourcesSessionKey, JsonSerializer.Serialize(resources, JsonOptions));
                return resources;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ResourcePrivilege] Failed to fetch resources for roles");
                return new List<string>();
            }
        }
    }
}
