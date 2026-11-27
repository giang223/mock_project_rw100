package com.minisocial.service;

import com.minisocial.dto.response.FollowActionResponse;
import com.minisocial.entity.Follow;
import com.minisocial.entity.Notification;
import com.minisocial.entity.User;
import com.minisocial.repository.FollowRepository;
import com.minisocial.repository.UserBlockRepository;
import com.minisocial.repository.UserRepository;
import com.minisocial.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @Mock private FollowRepository followRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserBlockRepository userBlockRepository;
    @Mock private SecurityUtils securityUtils;
    @Mock private NotificationService notificationService;

    @InjectMocks private FollowService followService;

    @Test
    void followingPrivateAccountCreatesPendingRequest() {
        User follower = user(1L, false);
        User privateAccount = user(2L, true);
        Follow pending = Follow.builder().id(5L).follower(follower).followee(privateAccount)
                .status(Follow.Status.PENDING).createdAt(LocalDateTime.now()).build();
        when(securityUtils.getCurrentUser()).thenReturn(follower);
        when(userRepository.findLockedById(2L)).thenReturn(Optional.of(privateAccount));
        when(followRepository.insertIfAbsent(eq(1L), eq(2L), eq("PENDING"), any(LocalDateTime.class)))
                .thenReturn(1);
        when(followRepository.findLockedByFollowerIdAndFolloweeId(1L, 2L)).thenReturn(Optional.of(pending));

        FollowActionResponse response = followService.follow(2L);

        assertFalse(response.isFollowing());
        assertEquals("PENDING", response.getStatus());
        verify(notificationService).createNotification(privateAccount, follower,
                Notification.Type.FOLLOW_REQUEST, null, "Test 1 đã gửi yêu cầu theo dõi bạn");
    }

    @Test
    void repeatFollowAcceptsPendingRequestAfterProfileBecomesPublic() {
        User follower = user(1L, false);
        User publicAccount = user(2L, false);
        Follow pending = Follow.builder().id(5L).follower(follower).followee(publicAccount)
                .status(Follow.Status.PENDING).createdAt(LocalDateTime.now()).build();
        when(securityUtils.getCurrentUser()).thenReturn(follower);
        when(userRepository.findLockedById(2L)).thenReturn(Optional.of(publicAccount));
        when(followRepository.insertIfAbsent(eq(1L), eq(2L), eq("ACCEPTED"), any(LocalDateTime.class)))
                .thenReturn(0);
        when(followRepository.findLockedByFollowerIdAndFolloweeId(1L, 2L)).thenReturn(Optional.of(pending));

        FollowActionResponse response = followService.follow(2L);

        assertTrue(response.isFollowing());
        assertEquals("ACCEPTED", response.getStatus());
        verify(notificationService).createNotification(follower, publicAccount,
                Notification.Type.FOLLOW_REQUEST_ACCEPTED, null,
                "Test 2 đã chấp nhận yêu cầu theo dõi của bạn");
    }

    @Test
    void acceptingPrivateFollowRequestMakesItVisibleAndNotifiesRequester() {
        User requester = user(1L, false);
        User owner = user(2L, true);
        Follow pending = Follow.builder().id(5L).follower(requester).followee(owner)
                .status(Follow.Status.PENDING).createdAt(LocalDateTime.now()).build();
        when(securityUtils.getCurrentUser()).thenReturn(owner);
        when(followRepository.findLockedByFollowerIdAndFolloweeId(1L, 2L)).thenReturn(Optional.of(pending));

        FollowActionResponse response = followService.acceptRequest(1L);

        assertTrue(response.isFollowing());
        assertEquals("ACCEPTED", response.getStatus());
        assertEquals(Follow.Status.ACCEPTED, pending.getStatus());
        verify(notificationService).createNotification(requester, owner,
                Notification.Type.FOLLOW_REQUEST_ACCEPTED, null,
                "Test 2 đã chấp nhận yêu cầu theo dõi của bạn");
    }

    private User user(Long id, boolean isPrivate) {
        return User.builder().id(id).fullName("Test " + id).email("user" + id + "@example.com")
                .isActive(true).isEmailVerified(true).isPrivate(isPrivate).build();
    }
}
