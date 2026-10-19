package com.bubble.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

public final class AuthRateLimitFilter extends OncePerRequestFilter {
    private final AuthRequestBudget budget;
    public AuthRateLimitFilter(AuthRequestBudget budget) { this.budget = budget; }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getServletPath();
        if ((("POST".equals(request.getMethod()) && (path.equals("/api/v1/auth/login") || path.equals("/api/v1/auth/register")))
                || ("PATCH".equals(request.getMethod()) && path.equals("/api/v1/users/me/password")))
                && !budget.acquire(request.getRemoteAddr())) {
            response.setStatus(429); response.setContentType("application/json"); response.setCharacterEncoding("UTF-8");
            response.setHeader("Retry-After", "60");
            response.getWriter().write("{\"status\":429,\"message\":\"Too many authentication requests. Try again later.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
