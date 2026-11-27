package com.minisocial.service;

import com.minisocial.entity.OAuthIdentity;

public record ExternalOAuthProfile(
        OAuthIdentity.Provider provider,
        String subject,
        String email,
        boolean emailVerified,
        String fullName,
        String avatarUrl) {
}
