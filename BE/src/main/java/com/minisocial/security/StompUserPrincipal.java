package com.minisocial.security;

import java.security.Principal;

/** Session-scoped STOMP identity. The broker user name is the revocable refresh-session ID. */
public record StompUserPrincipal(String email, String sessionId) implements Principal {

    @Override
    public String getName() {
        return sessionId;
    }
}
