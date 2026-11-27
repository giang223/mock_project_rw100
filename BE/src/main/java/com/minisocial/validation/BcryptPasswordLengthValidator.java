package com.minisocial.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;

public class BcryptPasswordLengthValidator implements ConstraintValidator<BcryptPasswordLength, String> {

    private static final int BCRYPT_MAX_PASSWORD_BYTES = 72;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || value.getBytes(StandardCharsets.UTF_8).length <= BCRYPT_MAX_PASSWORD_BYTES;
    }
}
