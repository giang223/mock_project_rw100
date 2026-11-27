package com.minisocial.validation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BcryptPasswordLengthValidatorTest {

    private final BcryptPasswordLengthValidator validator = new BcryptPasswordLengthValidator();

    @Test
    void acceptsAtMost72Utf8BytesRatherThan72JavaCharacters() {
        assertTrue(validator.isValid("a".repeat(72), null));
        assertFalse(validator.isValid("a".repeat(73), null));
        assertTrue(validator.isValid("😀".repeat(18), null));
        assertFalse(validator.isValid("😀".repeat(19), null));
    }

    @Test
    void allowsNullForOtherConstraintsToDecideWhetherValueIsRequired() {
        assertTrue(validator.isValid(null, null));
    }
}
