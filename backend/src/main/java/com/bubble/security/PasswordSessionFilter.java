package com.bubble.security;

import com.bubble.repository.UserRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** Reject every old session after a password change, including sessions on other instances. */
public final class PasswordSessionFilter extends OncePerRequestFilter {
    private final UserRepository users;
    public PasswordSessionFilter(UserRepository users) { this.users = users; }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AccountPrincipal principal
                && !users.findById(principal.id()).map(user -> principal.matchesPasswordVersion(user.getPasswordHash())).orElse(false)) {
            SecurityContextHolder.clearContext();
            var session = request.getSession(false);
            if (session != null) session.invalidate();
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":401,\"message\":\"Authentication required.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
