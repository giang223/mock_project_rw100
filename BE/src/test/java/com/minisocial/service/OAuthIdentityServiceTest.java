package com.minisocial.service;

import com.minisocial.entity.OAuthIdentity;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.OAuthIdentityRepository;
import com.minisocial.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OAuthIdentityServiceTest {

    @Mock private OAuthIdentityRepository oauthIdentityRepository;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private OAuthIdentityService oauthIdentityService;

    @Test
    void createsOAuthOnlyUserAndPersistsProviderSubjectAsIdentity() {
        when(oauthIdentityRepository.findByProviderAndProviderSubject(
                OAuthIdentity.Provider.GOOGLE, "google-sub-1")).thenReturn(Optional.empty());
        when(userRepository.findLockedByEmail("person@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("bcrypt-hash");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(41L);
            return user;
        });
        when(oauthIdentityRepository.saveAndFlush(any(OAuthIdentity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        User user = oauthIdentityService.resolveOrCreate(googleProfile("person@example.com", true));

        assertEquals(41L, user.getId());
        assertEquals("person@example.com", user.getEmail());
        assertEquals("Person Example", user.getFullName());
        assertTrue(user.getIsEmailVerified());
        assertEquals(User.Role.USER, user.getRole());
        ArgumentCaptor<OAuthIdentity> identity = ArgumentCaptor.forClass(OAuthIdentity.class);
        verify(oauthIdentityRepository).saveAndFlush(identity.capture());
        assertEquals(OAuthIdentity.Provider.GOOGLE, identity.getValue().getProvider());
        assertEquals("google-sub-1", identity.getValue().getProviderSubject());
        assertEquals("person@example.com", identity.getValue().getProviderEmail());
    }

    @Test
    void linksVerifiedProviderIdentityToExistingEmailAccount() {
        User existing = User.builder().id(9L).email("person@example.com").fullName("Existing")
                .role(User.Role.USER).isActive(true).isEmailVerified(false).build();
        when(oauthIdentityRepository.findByProviderAndProviderSubject(
                OAuthIdentity.Provider.GOOGLE, "google-sub-1")).thenReturn(Optional.empty());
        when(userRepository.findLockedByEmail("person@example.com")).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);
        when(oauthIdentityRepository.saveAndFlush(any(OAuthIdentity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        User linked = oauthIdentityService.resolveOrCreate(googleProfile("person@example.com", true));

        assertEquals(9L, linked.getId());
        assertTrue(linked.getIsEmailVerified());
        verify(userRepository).save(existing);
        verify(oauthIdentityRepository).saveAndFlush(any(OAuthIdentity.class));
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    void returnsExistingLinkedIdentityWithoutMatchingByEmail() {
        User existing = User.builder().id(9L).email("changed@example.com").fullName("Existing")
                .isActive(true).isEmailVerified(true).build();
        OAuthIdentity identity = OAuthIdentity.builder().user(existing)
                .provider(OAuthIdentity.Provider.GOOGLE).providerSubject("google-sub-1")
                .providerEmail("old@example.com").build();
        when(oauthIdentityRepository.findByProviderAndProviderSubject(
                OAuthIdentity.Provider.GOOGLE, "google-sub-1")).thenReturn(Optional.of(identity));

        User result = oauthIdentityService.resolveOrCreate(googleProfile("new@example.com", true));

        assertEquals(9L, result.getId());
        assertEquals("new@example.com", identity.getProviderEmail());
        verifyNoInteractions(userRepository, passwordEncoder);
        verify(oauthIdentityRepository, never()).saveAndFlush(any(OAuthIdentity.class));
    }

    @Test
    void existingProviderSubjectCanAuthenticateWhenEmailClaimIsNoLongerAvailable() {
        User existing = User.builder().id(9L).email("person@example.com").fullName("Existing")
                .isActive(true).isEmailVerified(true).build();
        OAuthIdentity identity = OAuthIdentity.builder().user(existing)
                .provider(OAuthIdentity.Provider.FACEBOOK).providerSubject("facebook-sub-1")
                .providerEmail("person@example.com").build();
        when(oauthIdentityRepository.findByProviderAndProviderSubject(
                OAuthIdentity.Provider.FACEBOOK, "facebook-sub-1")).thenReturn(Optional.of(identity));
        ExternalOAuthProfile profile = new ExternalOAuthProfile(
                OAuthIdentity.Provider.FACEBOOK, "facebook-sub-1", null, false, "Existing", null);

        User result = oauthIdentityService.resolveOrCreate(profile);

        assertEquals(9L, result.getId());
        assertEquals("person@example.com", identity.getProviderEmail());
        assertFalse(identity.getProviderEmail().isBlank());
        verifyNoInteractions(userRepository, passwordEncoder);
    }

    @Test
    void existingGoogleSubjectDoesNotDependOnEmailBeingReturnedAgain() {
        User existing = User.builder().id(9L).email("person@example.com").fullName("Existing")
                .isActive(true).isEmailVerified(true).build();
        OAuthIdentity identity = OAuthIdentity.builder().user(existing)
                .provider(OAuthIdentity.Provider.GOOGLE).providerSubject("google-sub-1")
                .providerEmail("person@example.com").build();
        when(oauthIdentityRepository.findByProviderAndProviderSubject(
                OAuthIdentity.Provider.GOOGLE, "google-sub-1")).thenReturn(Optional.of(identity));
        ExternalOAuthProfile profile = new ExternalOAuthProfile(
                OAuthIdentity.Provider.GOOGLE, "google-sub-1", null, false, "Existing", null);

        User result = oauthIdentityService.resolveOrCreate(profile);

        assertEquals(9L, result.getId());
        assertEquals("person@example.com", identity.getProviderEmail());
        verifyNoInteractions(userRepository, passwordEncoder);
    }

    @Test
    void createsFacebookUserAsUnverifiedUntilApplicationEmailVerification() {
        ExternalOAuthProfile profile = new ExternalOAuthProfile(
                OAuthIdentity.Provider.FACEBOOK, "facebook-sub-1", "person@example.com",
                false, "Person Example", null);
        when(oauthIdentityRepository.findByProviderAndProviderSubject(
                OAuthIdentity.Provider.FACEBOOK, "facebook-sub-1")).thenReturn(Optional.empty());
        when(userRepository.findLockedByEmail("person@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("bcrypt-hash");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(41L);
            return user;
        });
        when(oauthIdentityRepository.saveAndFlush(any(OAuthIdentity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        User user = oauthIdentityService.resolveOrCreate(profile);

        assertFalse(user.getIsEmailVerified());
        verify(oauthIdentityRepository).saveAndFlush(any(OAuthIdentity.class));
    }

    @Test
    void doesNotLinkFacebookEmailToExistingLocalAccountWithoutVerifiedClaim() {
        User existing = User.builder().id(9L).email("person@example.com").fullName("Existing")
                .role(User.Role.USER).isActive(true).isEmailVerified(true).build();
        when(oauthIdentityRepository.findByProviderAndProviderSubject(
                OAuthIdentity.Provider.FACEBOOK, "facebook-sub-1")).thenReturn(Optional.empty());
        when(userRepository.findLockedByEmail("person@example.com")).thenReturn(Optional.of(existing));
        ExternalOAuthProfile profile = new ExternalOAuthProfile(
                OAuthIdentity.Provider.FACEBOOK, "facebook-sub-1", "person@example.com",
                false, "Person Example", null);

        assertThrows(AppException.class, () -> oauthIdentityService.resolveOrCreate(profile));

        verify(oauthIdentityRepository, never()).saveAndFlush(any(OAuthIdentity.class));
        verify(userRepository, never()).save(existing);
    }

    @Test
    void rejectsUnverifiedEmailBeforeLookingUpOrCreatingAccounts() {
        assertThrows(AppException.class,
                () -> oauthIdentityService.resolveOrCreate(googleProfile("person@example.com", false)));

        verify(oauthIdentityRepository).findByProviderAndProviderSubject(
                OAuthIdentity.Provider.GOOGLE, "google-sub-1");
        verifyNoInteractions(userRepository, passwordEncoder);
    }

    @Test
    void rejectsInactiveAccountWhenIdentityAlreadyExists() {
        User inactive = User.builder().id(9L).email("person@example.com").isActive(false)
                .isEmailVerified(true).build();
        OAuthIdentity identity = OAuthIdentity.builder().user(inactive)
                .provider(OAuthIdentity.Provider.GOOGLE).providerSubject("google-sub-1")
                .providerEmail("person@example.com").build();
        when(oauthIdentityRepository.findByProviderAndProviderSubject(
                OAuthIdentity.Provider.GOOGLE, "google-sub-1")).thenReturn(Optional.of(identity));

        assertThrows(AppException.class,
                () -> oauthIdentityService.resolveOrCreate(googleProfile("person@example.com", true)));

        verify(userRepository, never()).findLockedByEmail(anyString());
        verify(oauthIdentityRepository, never()).saveAndFlush(any(OAuthIdentity.class));
    }

    private ExternalOAuthProfile googleProfile(String email, boolean verified) {
        return new ExternalOAuthProfile(OAuthIdentity.Provider.GOOGLE, "google-sub-1", email,
                verified, "Person Example", "https://cdn.example.com/avatar.png");
    }
}
