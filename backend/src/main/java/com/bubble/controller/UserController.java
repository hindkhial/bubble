package com.bubble.controller;

import com.bubble.dto.AccountResponse;
import com.bubble.security.AccountPrincipal;
import com.bubble.service.AccountService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {
    private final AccountService accounts;
    private final com.bubble.security.AuthRequestBudget passwordBudget = new com.bubble.security.AuthRequestBudget(5, 500);
    public UserController(AccountService accounts) { this.accounts = accounts; }

    @org.springframework.web.bind.annotation.PatchMapping("/api/v1/users/me/password")
    public org.springframework.http.ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal AccountPrincipal principal,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody com.bubble.dto.ChangePasswordRequest input,
            jakarta.servlet.http.HttpServletRequest request) {
        if (!passwordBudget.acquire(principal.id().toString()))
            return org.springframework.http.ResponseEntity.status(429).header("Retry-After", "60").build();
        if (!accounts.changePassword(principal.id(), input))
            return org.springframework.http.ResponseEntity.badRequest().build();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        return org.springframework.http.ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/users/me")
    public AccountResponse current(@AuthenticationPrincipal AccountPrincipal principal) {
        return accounts.current(principal.id());
    }
}
