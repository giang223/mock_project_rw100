package com.minisocial.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.minisocial.dto.response.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;

@RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Map<String, Policy> POLICIES = Map.of(
            "/api/auth/login", new Policy(30, Duration.ofMinutes(15)),
            "/api/auth/register", new Policy(20, Duration.ofHours(1)),
            "/api/auth/verify-email", new Policy(30, Duration.ofMinutes(10)),
            "/api/auth/verify-email/resend", new Policy(10, Duration.ofHours(1)),
            "/api/auth/forgot-password", new Policy(10, Duration.ofHours(1)),
            "/api/auth/reset-password", new Policy(30, Duration.ofHours(1)),
            "/api/auth/refresh", new Policy(120, Duration.ofMinutes(1))
    );

    private final AuthRateLimitService rateLimitService;
    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod()) || !POLICIES.containsKey(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        Policy policy = POLICIES.get(request.getServletPath());
        String key = request.getServletPath() + ":" + request.getRemoteAddr();
        AuthRateLimitService.Decision decision = rateLimitService.acquire(key, policy.limit(), policy.window());
        if (!decision.allowed()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.setHeader("Retry-After", Long.toString(decision.retryAfterSeconds()));
            objectMapper.writeValue(response.getWriter(), ApiResponse.error(
                    "Bạn thao tác quá nhanh. Vui lòng thử lại sau."));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private record Policy(int limit, Duration window) {
    }
}
