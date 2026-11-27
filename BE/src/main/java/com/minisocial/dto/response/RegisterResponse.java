package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterResponse {
    private String email;
    private String username;
    private boolean requiresEmailVerification;
}
