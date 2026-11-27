package com.minisocial.service;

import com.minisocial.dto.request.UpdateProfileRequest;
import com.minisocial.dto.request.DeactivateAccountRequest;
import com.minisocial.dto.request.ChangePasswordRequest;
import com.minisocial.entity.Follow;
import com.minisocial.entity.Notification;
import com.minisocial.entity.UserAccountEvent;
import com.minisocial.entity.User;
import com.minisocial.repository.*;
import com.minisocial.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserBlockRepository userBlockRepository;
    @Mock private FriendshipRepository friendshipRepository;
    @Mock private FollowRepository followRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Mock private FileStorageService fileStorageService;
    @Mock private SecurityUtils securityUtils;
    @Mock private NotificationService notificationService;
    @Mock private UserAccountEventRepository userAccountEventRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;

    @InjectMocks private UserService userService;

    @Test
    void makingPrivateProfilePublicAcceptsPendingRequestsAndNotifiesRequesters() {
        User owner = user(10L, "Owner", true);
        User requesterOne = user(11L, "Requester One", false);
        User requesterTwo = user(12L, "Requester Two", false);
        Follow firstRequest = pending(requesterOne, owner);
        Follow secondRequest = pending(requesterTwo, owner);
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setIsPrivate(false);

        when(securityUtils.getCurrentUserId()).thenReturn(10L);
        when(userRepository.findLockedById(10L)).thenReturn(Optional.of(owner));
        when(followRepository.findByFolloweeIdAndStatusOrderByCreatedAtAsc(10L, Follow.Status.PENDING))
                .thenReturn(List.of(firstRequest, secondRequest));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.updateProfile(request);

        assertFalse(owner.getIsPrivate());
        assertEquals(Follow.Status.ACCEPTED, firstRequest.getStatus());
        assertEquals(Follow.Status.ACCEPTED, secondRequest.getStatus());
        verify(notificationService).createNotification(requesterOne, owner,
                Notification.Type.FOLLOW_REQUEST_ACCEPTED, null,
                "Owner đã chấp nhận yêu cầu theo dõi của bạn");
        verify(notificationService).createNotification(requesterTwo, owner,
                Notification.Type.FOLLOW_REQUEST_ACCEPTED, null,
                "Owner đã chấp nhận yêu cầu theo dõi của bạn");
    }

    @Test
    void uploadingCoverUsesSharedImageStorageAndReturnsCoverUrl() throws Exception {
        User owner = user(10L, "Owner", false);
        when(securityUtils.getCurrentUser()).thenReturn(owner);
        when(fileStorageService.uploadFile(any(), org.mockito.ArgumentMatchers.eq("covers")))
                .thenReturn("https://cdn.example.com/cover.png");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = userService.uploadCover(new MockMultipartFile(
                "file", "cover.png", "image/png", new byte[]{1, 2, 3}));

        assertEquals("https://cdn.example.com/cover.png", response.getCoverUrl());
        assertEquals("https://cdn.example.com/cover.png", owner.getCoverUrl());
    }

    @Test
    void deactivationReauthenticatesHidesAccountAndRevokesEverySession() {
        User owner = user(10L, "Owner", false);
        when(securityUtils.getCurrentUserId()).thenReturn(owner.getId());
        when(userRepository.findLockedById(owner.getId())).thenReturn(Optional.of(owner));
        when(passwordEncoder.matches("current", owner.getPasswordHash())).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userAccountEventRepository.save(any(UserAccountEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        DeactivateAccountRequest request = new DeactivateAccountRequest();
        request.setCurrentPassword("current");

        userService.deactivateAccount(request);

        assertFalse(owner.getIsActive());
        verify(refreshTokenRepository).revokeActiveSessionsByUserId(
                org.mockito.ArgumentMatchers.eq(owner.getId()), any(LocalDateTime.class));
        org.mockito.ArgumentCaptor<UserAccountEvent> event =
                org.mockito.ArgumentCaptor.forClass(UserAccountEvent.class);
        verify(userAccountEventRepository).save(event.capture());
        assertEquals("SELF_DEACTIVATED", event.getValue().getEventType());
        assertEquals(owner, event.getValue().getUser());
    }

    @Test
    void wrongPasswordPreventsAccountDeactivation() {
        User owner = user(10L, "Owner", false);
        when(securityUtils.getCurrentUserId()).thenReturn(owner.getId());
        when(userRepository.findLockedById(owner.getId())).thenReturn(Optional.of(owner));
        when(passwordEncoder.matches("wrong", owner.getPasswordHash())).thenReturn(false);
        DeactivateAccountRequest request = new DeactivateAccountRequest();
        request.setCurrentPassword("wrong");

        assertThrows(com.minisocial.exception.AppException.class,
                () -> userService.deactivateAccount(request));
        verify(userRepository, never()).save(any(User.class));
        verify(userAccountEventRepository, never()).save(any(UserAccountEvent.class));
    }

    @Test
    void lastActiveAdminCannotDeactivateTheirAccount() {
        User admin = user(10L, "Admin", false);
        admin.setRole(User.Role.ADMIN);
        when(securityUtils.getCurrentUserId()).thenReturn(admin.getId());
        when(userRepository.findLockedById(admin.getId())).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("current", admin.getPasswordHash())).thenReturn(true);
        when(userRepository.countByRoleAndIsActiveTrueAndIsEmailVerifiedTrue(User.Role.ADMIN)).thenReturn(1L);
        DeactivateAccountRequest request = new DeactivateAccountRequest();
        request.setCurrentPassword("current");

        assertThrows(com.minisocial.exception.AppException.class,
                () -> userService.deactivateAccount(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changingPasswordLocksTheAccountAndInvalidatesResetLinksAndSessions() {
        User owner = user(10L, "Owner", false);
        when(securityUtils.getCurrentUser()).thenReturn(owner);
        when(userRepository.findLockedById(owner.getId())).thenReturn(Optional.of(owner));
        when(passwordEncoder.matches("current", owner.getPasswordHash())).thenReturn(true);
        when(passwordEncoder.encode("new-password-123")).thenReturn("new-password-hash");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("current");
        request.setNewPassword("new-password-123");
        request.setConfirmPassword("new-password-123");

        userService.changePassword(request);

        assertEquals("new-password-hash", owner.getPasswordHash());
        verify(passwordResetTokenRepository).deleteByUserId(owner.getId());
        verify(refreshTokenRepository).revokeActiveSessionsByUserId(
                org.mockito.ArgumentMatchers.eq(owner.getId()), any(LocalDateTime.class));
    }

    private Follow pending(User follower, User followee) {
        return Follow.builder().follower(follower).followee(followee).status(Follow.Status.PENDING)
                .createdAt(LocalDateTime.now()).build();
    }

    private User user(Long id, String name, boolean isPrivate) {
        return User.builder().id(id).fullName(name).email("user" + id + "@example.com")
                .passwordHash("hash").isActive(true).isEmailVerified(true).isPrivate(isPrivate).build();
    }
}
