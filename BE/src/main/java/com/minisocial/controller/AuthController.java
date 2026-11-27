package com.minisocial.controller;

import com.minisocial.dto.request.ForgotPasswordRequest;
import com.minisocial.dto.request.LoginRequest;
import com.minisocial.dto.request.RegisterRequest;
import com.minisocial.dto.request.ResetPasswordRequest;
import com.minisocial.dto.request.VerifyEmailRequest;
import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.AuthResponse;
import com.minisocial.dto.response.AuthSessionResponse;
import com.minisocial.dto.response.RegisterResponse;
import com.minisocial.exception.AppException;
import com.minisocial.security.AllowedOriginPolicy;
import com.minisocial.security.AuthCookieService;
import com.minisocial.service.AuthSession;
import com.minisocial.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;
    private final AllowedOriginPolicy allowedOriginPolicy;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo tài khoản thành công. Hãy kiểm tra email để xác minh.",
                        authService.register(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        requireTrustedCookieOrigin(httpRequest);
        return withRefreshCookie(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(HttpServletRequest request) {
        requireTrustedCookieOrigin(request);
        try {
            String refreshToken = authCookieService.readRefreshToken(request);
            return withRefreshCookie(authService.refreshToken(refreshToken));
        } catch (AppException exception) {
            return ResponseEntity.status(exception.getStatus())
                    .header(HttpHeaders.SET_COOKIE, authCookieService.clearRefreshCookie().toString())
                    .body(ApiResponse.error(exception.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request) {
        requireTrustedCookieOrigin(request);
        authService.logout(authCookieService.readRefreshToken(request));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookieService.clearRefreshCookie().toString())
                .body(ApiResponse.success("Đăng xuất thành công"));
    }

    @GetMapping("/sessions")
    public ApiResponse<List<AuthSessionResponse>> getActiveSessions(HttpServletRequest request) {
        return ApiResponse.success(authService.getActiveSessions(
                authCookieService.readRefreshToken(request)));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> revokeSession(
            @PathVariable String sessionId,
            HttpServletRequest request) {
        boolean revokedCurrentCookieSession = authService.revokeSession(
                sessionId, authCookieService.readRefreshToken(request));
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        if (revokedCurrentCookieSession) {
            response.header(HttpHeaders.SET_COOKIE, authCookieService.clearRefreshCookie().toString());
        }
        return response.body(ApiResponse.success("Đã thu hồi phiên đăng nhập"));
    }

    @DeleteMapping("/sessions")
    public ResponseEntity<ApiResponse<Void>> revokeAllSessions() {
        authService.revokeAllSessions();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookieService.clearRefreshCookie().toString())
                .body(ApiResponse.success("Đã đăng xuất khỏi tất cả thiết bị"));
    }

    @PostMapping("/verify-email")
    public ApiResponse<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.getEmail(), request.getCode());
        return ApiResponse.success("Xác minh email thành công");
    }

    @PostMapping("/verify-email/resend")
    public ApiResponse<Void> resendVerification(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.resendVerification(request.getEmail());
        return ApiResponse.success("Nếu tài khoản cần xác minh, mã mới sẽ được gửi đến email.");
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ApiResponse.success("Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookieService.clearRefreshCookie().toString())
                .body(ApiResponse.success("Đặt lại mật khẩu thành công"));
    }

    private ResponseEntity<ApiResponse<AuthResponse>> withRefreshCookie(AuthSession authSession) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE,
                        authCookieService.createRefreshCookie(authSession.getRefreshToken()).toString())
                .body(ApiResponse.success(authSession.getResponse()));
    }

    private void requireTrustedCookieOrigin(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (!allowedOriginPolicy.allows(origin)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Nguồn truy cập không được phép");
        }
    }
}
