package com.minisocial.service;

public record PasswordResetEmailRequested(String email, String fullName, String token) {
}
