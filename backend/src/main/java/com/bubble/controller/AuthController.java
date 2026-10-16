package com.bubble.controller;

import com.bubble.dto.*;
import com.bubble.security.AccountPrincipal;
import com.bubble.service.AccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
    private final AccountService accounts;
    private final AuthenticationManager authenticator;
    private final SessionAuthenticationStrategy sessions;
    private final HttpSessionSecurityContextRepository contexts;
    public AuthController(AccountService accounts, AuthenticationManager authenticator,
            SessionAuthenticationStrategy sessions, HttpSessionSecurityContextRepository contexts) {
        this.accounts = accounts; this.authenticator = authenticator; this.sessions = sessions; this.contexts = contexts;
    }

    public record CsrfResponse(String headerName, String token) {}
    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) { return new CsrfResponse(token.getHeaderName(), token.getToken()); }

    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse register(@Valid @RequestBody RegisterRequest input) { return accounts.register(input); }

    @PostMapping("/login")
    public AccountResponse login(@Valid @RequestBody LoginRequest input,
            HttpServletRequest request, HttpServletResponse response) {
        var authentication = authenticator.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(input.email(), input.password()));
        sessions.onAuthentication(authentication, request, response);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        return accounts.current(((AccountPrincipal) authentication.getPrincipal()).id());
    }
}
