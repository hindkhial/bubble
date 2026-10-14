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
    public UserController(AccountService accounts) { this.accounts = accounts; }

    @GetMapping("/api/v1/users/me")
    public AccountResponse current(@AuthenticationPrincipal AccountPrincipal principal) {
        return accounts.current(principal.id());
    }
}
