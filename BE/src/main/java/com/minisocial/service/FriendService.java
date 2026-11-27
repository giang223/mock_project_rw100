package com.minisocial.service;

import com.minisocial.dto.response.FriendshipResponse;
import com.minisocial.dto.response.UserSearchResponse;
import com.minisocial.entity.*;
import com.minisocial.exception.AppException;
import com.minisocial.repository.*;
import com.minisocial.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final SecurityUtils securityUtils;
    private final NotificationService notificationService;

    @Transactional
    public FriendshipResponse sendFriendRequest(Long targetId) {
        User currentUser = securityUtils.getCurrentUser();
        if (currentUser.getId().equals(targetId)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể gửi lời mời kết bạn cho chính mình");
        }

        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));
        if (!Boolean.TRUE.equals(target.getIsActive()) || !Boolean.TRUE.equals(target.getIsEmailVerified())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại");
        }

        if (userBlockRepository.existsByBlockerIdAndBlockedId(currentUser.getId(), targetId) ||
                userBlockRepository.existsByBlockerIdAndBlockedId(targetId, currentUser.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không thể gửi lời mời kết bạn");
        }

        friendshipRepository.findBetweenUsers(currentUser.getId(), targetId).ifPresent(f -> {
            throw new AppException(HttpStatus.CONFLICT, "Đã tồn tại mối quan hệ với người này");
        });

        Friendship friendship = Friendship.builder()
                .requester(currentUser)
                .addressee(target)
                .status(Friendship.Status.PENDING)
                .build();
        friendshipRepository.save(friendship);

        notificationService.createNotification(
                target, currentUser, Notification.Type.FRIEND_REQUEST, null,
                currentUser.getFullName() + " đã gửi lời mời kết bạn cho bạn");

        return mapToResponse(friendship, currentUser.getId());
    }

    @Transactional
    public FriendshipResponse acceptFriendRequest(Long friendshipId) {
        User currentUser = securityUtils.getCurrentUser();
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Lời mời không tồn tại"));

        if (!friendship.getAddressee().getId().equals(currentUser.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không thể chấp nhận lời mời này");
        }
        if (friendship.getStatus() != Friendship.Status.PENDING) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Lời mời đã được xử lý");
        }

        friendship.setStatus(Friendship.Status.ACCEPTED);
        friendshipRepository.save(friendship);

        notificationService.createNotification(
                friendship.getRequester(), currentUser, Notification.Type.FRIEND_ACCEPTED, null,
                currentUser.getFullName() + " đã chấp nhận lời mời kết bạn của bạn");

        return mapToResponse(friendship, currentUser.getId());
    }

    @Transactional
    public void rejectOrCancelRequest(Long friendshipId) {
        User currentUser = securityUtils.getCurrentUser();
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Lời mời không tồn tại"));

        boolean isAddressee = friendship.getAddressee().getId().equals(currentUser.getId());
        boolean isRequester = friendship.getRequester().getId().equals(currentUser.getId());

        if (!isAddressee && !isRequester) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền");
        }

        friendshipRepository.delete(friendship);
    }

    @Transactional
    public void unfriend(Long friendId) {
        Long currentUserId = securityUtils.getCurrentUserId();
        Friendship friendship = friendshipRepository.findBetweenUsers(currentUserId, friendId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Chưa là bạn bè"));

        if (friendship.getStatus() != Friendship.Status.ACCEPTED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Hai người chưa là bạn bè");
        }

        friendshipRepository.delete(friendship);
    }

    @Transactional(readOnly = true)
    public Page<FriendshipResponse> getReceivedRequests(Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        return friendshipRepository.findByAddresseeIdAndStatus(currentUserId, Friendship.Status.PENDING, pageable)
                .map(f -> mapToResponse(f, currentUserId));
    }

    @Transactional(readOnly = true)
    public Page<FriendshipResponse> getSentRequests(Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        return friendshipRepository.findByRequesterIdAndStatus(currentUserId, Friendship.Status.PENDING, pageable)
                .map(f -> mapToResponse(f, currentUserId));
    }

    @Transactional(readOnly = true)
    public Page<FriendshipResponse> getFriends(Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        return friendshipRepository.findFriendsOf(currentUserId, pageable)
                .map(f -> mapToResponse(f, currentUserId));
    }

    @Transactional(readOnly = true)
    public Page<UserSearchResponse> getFriendSuggestions(Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        Pageable rankedPage = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return userRepository.findFriendSuggestions(currentUserId, rankedPage)
                .map(user -> UserSearchResponse.builder()
                        .id(user.getId())
                        .fullName(user.getFullName())
                        .username(user.getUsername())
                        .avatarUrl(user.getAvatarUrl())
                        .bio(user.getBio())
                        .mutualFriendCount(user.getMutualFriendCount())
                        .friendshipStatus("none")
                        .build());
    }

    private FriendshipResponse mapToResponse(Friendship friendship, Long currentUserId) {
        User otherUser = friendship.getRequester().getId().equals(currentUserId)
                ? friendship.getAddressee()
                : friendship.getRequester();

        long mutualCount = friendshipRepository.countMutualFriends(currentUserId, otherUser.getId());

        return FriendshipResponse.builder()
                .id(friendship.getId())
                .user(PostService.mapToUserSummary(otherUser))
                .status(friendship.getStatus())
                .mutualFriendCount(mutualCount)
                .createdAt(friendship.getCreatedAt())
                .build();
    }
}
