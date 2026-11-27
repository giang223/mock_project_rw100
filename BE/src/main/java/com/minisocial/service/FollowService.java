package com.minisocial.service;

import com.minisocial.dto.response.FollowActionResponse;
import com.minisocial.dto.response.FollowRequestResponse;
import com.minisocial.dto.response.UserSummaryResponse;
import com.minisocial.entity.Follow;
import com.minisocial.entity.Notification;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.FollowRepository;
import com.minisocial.repository.UserBlockRepository;
import com.minisocial.repository.UserRepository;
import com.minisocial.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final SecurityUtils securityUtils;
    private final NotificationService notificationService;

    @Transactional
    public FollowActionResponse follow(Long followeeId) {
        User follower = securityUtils.getCurrentUser();
        if (follower.getId().equals(followeeId)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể theo dõi chính mình");
        }

        User followee = userRepository.findLockedById(followeeId)
                .filter(user -> Boolean.TRUE.equals(user.getIsActive())
                        && Boolean.TRUE.equals(user.getIsEmailVerified()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));
        ensureNotBlocked(follower.getId(), followeeId);
        Follow.Status requestedStatus = Boolean.TRUE.equals(followee.getIsPrivate())
                ? Follow.Status.PENDING : Follow.Status.ACCEPTED;

        boolean created = followRepository.insertIfAbsent(
                follower.getId(), followeeId, requestedStatus.name(), LocalDateTime.now()) > 0;
        Follow stored = followRepository.findLockedByFollowerIdAndFolloweeId(follower.getId(), followeeId)
                .orElseThrow(() -> new IllegalStateException("Follow relation was not persisted"));

        boolean acceptedAfterPrivacyChange = !created
                && stored.getStatus() == Follow.Status.PENDING
                && !Boolean.TRUE.equals(followee.getIsPrivate());
        if (acceptedAfterPrivacyChange) {
            stored.setStatus(Follow.Status.ACCEPTED);
            notificationService.createNotification(
                    stored.getFollower(), stored.getFollowee(), Notification.Type.FOLLOW_REQUEST_ACCEPTED, null,
                    stored.getFollowee().getFullName() + " đã chấp nhận yêu cầu theo dõi của bạn");
        } else if (created && stored.getStatus() == Follow.Status.PENDING) {
            notificationService.createNotification(
                    followee, follower, Notification.Type.FOLLOW_REQUEST, null,
                    follower.getFullName() + " đã gửi yêu cầu theo dõi bạn");
        } else if (created) {
            notificationService.createNotification(
                    followee, follower, Notification.Type.FOLLOW, null,
                    follower.getFullName() + " đã theo dõi bạn");
        }
        return followAction(stored.getStatus());
    }

    @Transactional
    public FollowActionResponse unfollow(Long followeeId) {
        Long followerId = securityUtils.getCurrentUserId();
        followRepository.deleteByFollowerIdAndFolloweeId(followerId, followeeId);
        return FollowActionResponse.builder().following(false).status("NONE").build();
    }

    @Transactional(readOnly = true)
    public Page<UserSummaryResponse> getFollowers(Long userId, Pageable pageable) {
        User user = activeUser(userId);
        Long currentUserId = securityUtils.getCurrentUserId();
        ensureNotBlocked(currentUserId, user.getId());
        ensureProfileVisible(user, currentUserId);
        return followRepository.findVisibleFollowers(userId, currentUserId, pageable)
                .map(follow -> PostService.mapToUserSummary(follow.getFollower()));
    }

    @Transactional(readOnly = true)
    public Page<UserSummaryResponse> getFollowing(Long userId, Pageable pageable) {
        User user = activeUser(userId);
        Long currentUserId = securityUtils.getCurrentUserId();
        ensureNotBlocked(currentUserId, user.getId());
        ensureProfileVisible(user, currentUserId);
        return followRepository.findVisibleFollowing(userId, currentUserId, pageable)
                .map(follow -> PostService.mapToUserSummary(follow.getFollowee()));
    }

    @Transactional(readOnly = true)
    public Page<FollowRequestResponse> getPendingRequests(Pageable pageable) {
        Long userId = securityUtils.getCurrentUserId();
        return followRepository.findPendingRequests(userId, Follow.Status.PENDING, pageable)
                .map(follow -> FollowRequestResponse.builder()
                        .requester(PostService.mapToUserSummary(follow.getFollower()))
                        .requestedAt(follow.getCreatedAt())
                        .build());
    }

    @Transactional
    public FollowActionResponse acceptRequest(Long requesterId) {
        User followee = securityUtils.getCurrentUser();
        Follow follow = followRepository.findLockedByFollowerIdAndFolloweeId(requesterId, followee.getId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Yêu cầu theo dõi không tồn tại"));
        if (follow.getStatus() == Follow.Status.PENDING) {
            follow.setStatus(Follow.Status.ACCEPTED);
            notificationService.createNotification(
                    follow.getFollower(), followee, Notification.Type.FOLLOW_REQUEST_ACCEPTED, null,
                    followee.getFullName() + " đã chấp nhận yêu cầu theo dõi của bạn");
        }
        return followAction(follow.getStatus());
    }

    @Transactional
    public void rejectRequest(Long requesterId) {
        Long followeeId = securityUtils.getCurrentUserId();
        if (followRepository.deleteByFollowerIdAndFolloweeIdAndStatus(
                requesterId, followeeId, Follow.Status.PENDING) == 0) {
            throw new AppException(HttpStatus.NOT_FOUND, "Yêu cầu theo dõi không tồn tại");
        }
    }

    private FollowActionResponse followAction(Follow.Status status) {
        return FollowActionResponse.builder()
                .following(status == Follow.Status.ACCEPTED)
                .status(status.name())
                .build();
    }

    private void ensureProfileVisible(User target, Long viewerId) {
        if (!target.getId().equals(viewerId)
                && Boolean.TRUE.equals(target.getIsPrivate())
                && !followRepository.hasAcceptedFollow(viewerId, target.getId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại");
        }
    }

    private User activeUser(Long userId) {
        return userRepository.findById(userId)
                .filter(user -> Boolean.TRUE.equals(user.getIsActive())
                        && Boolean.TRUE.equals(user.getIsEmailVerified()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));
    }

    private void ensureNotBlocked(Long currentUserId, Long targetUserId) {
        if (!currentUserId.equals(targetUserId)
                && (userBlockRepository.existsByBlockerIdAndBlockedId(currentUserId, targetUserId)
                || userBlockRepository.existsByBlockerIdAndBlockedId(targetUserId, currentUserId))) {
            throw new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại");
        }
    }
}
