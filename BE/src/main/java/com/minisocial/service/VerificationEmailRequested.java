package com.minisocial.service;

public record VerificationEmailRequested(String email, String fullName, String code) {
}
