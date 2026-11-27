package com.minisocial.service;

import com.minisocial.dto.response.AuthResponse;

/** Internal login result. The refresh token must only be written to an HttpOnly cookie. */
public final class AuthSession {

    private final AuthResponse response;
    private final String refreshToken;

    public AuthSession(AuthResponse response, String refreshToken) {
        this.response = response;
        this.refreshToken = refreshToken;
    }

    public AuthResponse getResponse() {
        return response;
    }

    public String getRefreshToken() {
        return refreshToken;
    }
}
