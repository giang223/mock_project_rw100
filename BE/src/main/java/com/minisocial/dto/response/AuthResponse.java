package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String accessToken;
    private String tokenType;
    private UserResponse user;

    public static AuthResponse of(String accessToken, UserResponse user) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .user(user)
                .build();
    }
}
