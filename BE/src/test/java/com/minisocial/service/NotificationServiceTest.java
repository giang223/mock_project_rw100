package com.minisocial.service;

import com.minisocial.dto.request.UpdateNotificationPreferencesRequest;
import com.minisocial.entity.Notification;
import com.minisocial.entity.NotificationPreference;
import com.minisocial.entity.User;
import com.minisocial.repository.NotificationPreferenceRepository;
import com.minisocial.repository.NotificationRepository;
import com.minisocial.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private NotificationPreferenceRepository preferenceRepository;
    @Mock private SecurityUtils securityUtils;
    @InjectMocks private NotificationService notificationService;

    @Test
    void defaultsAllUserFacingNotificationCategoriesToEnabled() {
        when(securityUtils.getCurrentUserId()).thenReturn(12L);
        when(preferenceRepository.findByUserId(12L)).thenReturn(Optional.empty());

        var preferences = notificationService.getPreferences();

        assertTrue(preferences.isSocialEnabled());
        assertTrue(preferences.isMessagesEnabled());
    }

    @Test
    void suppressesDisabledSocialNotificationsButKeepsMessagesEnabled() {
        User recipient = user(12L);
        when(preferenceRepository.findByUserId(12L)).thenReturn(Optional.of(
                NotificationPreference.builder().userId(12L).socialEnabled(false).messagesEnabled(true).build()));

        notificationService.createNotification(recipient, user(13L), Notification.Type.LIKE, null, "liked");
        notificationService.createNotification(recipient, user(13L), Notification.Type.MESSAGE, null, "message");

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(saved.capture());
        org.junit.jupiter.api.Assertions.assertEquals(Notification.Type.MESSAGE, saved.getValue().getType());
    }

    @Test
    void adminWarningsAreNotSuppressedBySocialPreference() {
        User recipient = user(12L);
        when(preferenceRepository.findByUserId(12L)).thenReturn(Optional.of(
                NotificationPreference.builder().userId(12L).socialEnabled(false).messagesEnabled(false).build()));

        notificationService.createNotification(recipient, user(1L), Notification.Type.ADMIN_WARNING, null, "warning");

        verify(notificationRepository).save(any());
    }

    @Test
    void persistsCompletePreferenceUpdatesForTheAuthenticatedUser() {
        when(securityUtils.getCurrentUserId()).thenReturn(12L);
        UpdateNotificationPreferencesRequest request = new UpdateNotificationPreferencesRequest();
        request.setSocialEnabled(false);
        request.setMessagesEnabled(true);

        var response = notificationService.updatePreferences(request);

        assertFalse(response.isSocialEnabled());
        assertTrue(response.isMessagesEnabled());
        verify(preferenceRepository).upsert(eq(12L), eq(false), eq(true));
    }

    private User user(Long id) {
        return User.builder().id(id).build();
    }
}
