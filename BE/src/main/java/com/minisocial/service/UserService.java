package com.minisocial.service;

import com.minisocial.dto.request.ChangePasswordRequest;
import com.minisocial.dto.request.DeactivateAccountRequest;
import com.minisocial.dto.request.UpdateProfileRequest;
import com.minisocial.dto.response.UserResponse;
import com.minisocial.dto.response.UserSearchResponse;
import com.minisocial.entity.Friendship;
import com.minisocial.entity.Follow;
import com.minisocial.entity.Notification;
import com.minisocial.entity.User;
import com.minisocial.entity.UserBlock;
import com.minisocial.entity.UserAccountEvent;
import com.minisocial.exception.AppException;
import com.minisocial.repository.*;
import com.minisocial.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final FriendshipRepository friendshipRepository;
    private final FollowRepository followRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;
    private final SecurityUtils securityUtils;
    private final NotificationService notificationService;
    private final UserAccountEventRepository userAccountEventRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    @Transactional(readOnly = true)
    public UserResponse getMyProfile() {
        User user = securityUtils.getCurrentUser();
        return AuthService.mapToUserResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(UpdateProfileRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        User user = userRepository.findLockedById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));

        if (request.getFullName() != null) {
            if (request.getFullName().isBlank()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Họ và tên không được để trống");
            }
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) user.setPhone(request.getPhone().trim());
        if (request.getBirthday() != null) user.setBirthday(request.getBirthday());
        if (request.getGender() != null) user.setGender(request.getGender());
        if (request.getAddress() != null) user.setAddress(request.getAddress().trim());
        if (request.getBio() != null) user.setBio(request.getBio().trim());
        boolean becamePublic = request.getIsPrivate() != null
                && Boolean.TRUE.equals(user.getIsPrivate())
                && !request.getIsPrivate();
        if (request.getIsPrivate() != null) user.setIsPrivate(request.getIsPrivate());

        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            String newUsername = request.getUsername().trim().toLowerCase(Locale.ROOT);
            if (!newUsername.equals(user.getUsername()) &&
                    userRepository.existsByUsername(newUsername)) {
                throw new AppException(HttpStatus.CONFLICT, "Username này đã được sử dụng");
            }
            user.setUsername(newUsername);
        }

        userRepository.save(user);
        if (becamePublic) {
            List<Follow> pendingRequests = followRepository.findByFolloweeIdAndStatusOrderByCreatedAtAsc(
                    userId, Follow.Status.PENDING);
            for (Follow requestToAccept : pendingRequests) {
                requestToAccept.setStatus(Follow.Status.ACCEPTED);
                notificationService.createNotification(
                        requestToAccept.getFollower(), user, Notification.Type.FOLLOW_REQUEST_ACCEPTED, null,
                        user.getFullName() + " đã chấp nhận yêu cầu theo dõi của bạn");
            }
        }
        return AuthService.mapToUserResponse(user);
    }

    @Transactional
    public UserResponse uploadAvatar(MultipartFile file) throws IOException {
        User user = securityUtils.getCurrentUser();
        String avatarUrl = fileStorageService.uploadFile(file, "avatars");
        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);
        return AuthService.mapToUserResponse(user);
    }

    @Transactional
    public UserResponse uploadCover(MultipartFile file) throws IOException {
        User user = securityUtils.getCurrentUser();
        String coverUrl = fileStorageService.uploadFile(file, "covers");
        user.setCoverUrl(coverUrl);
        userRepository.save(user);
        return AuthService.mapToUserResponse(user);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mật khẩu xác nhận không khớp");
        }

        User authenticatedUser = securityUtils.getCurrentUser();
        User user = userRepository.findLockedById(authenticatedUser.getId())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Tài khoản không thể tiếp tục đăng nhập"));
        if (!Boolean.TRUE.equals(user.getIsActive()) || !Boolean.TRUE.equals(user.getIsEmailVerified())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Tài khoản không thể tiếp tục đăng nhập");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        passwordResetTokenRepository.deleteByUserId(user.getId());
        refreshTokenRepository.revokeActiveSessionsByUserId(user.getId(), java.time.LocalDateTime.now());
    }

    @Transactional
    public void deactivateAccount(DeactivateAccountRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        User user = userRepository.findLockedById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
        }
        if (user.getRole() == User.Role.ADMIN
                && userRepository.countByRoleAndIsActiveTrueAndIsEmailVerifiedTrue(User.Role.ADMIN) <= 1) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Không thể vô hiệu hóa quản trị viên đang hoạt động cuối cùng");
        }
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new AppException(HttpStatus.CONFLICT, "Tài khoản đã bị vô hiệu hóa");
        }

        user.setIsActive(false);
        userRepository.save(user);
        refreshTokenRepository.revokeActiveSessionsByUserId(userId, java.time.LocalDateTime.now());
        userAccountEventRepository.save(UserAccountEvent.builder()
                .user(user)
                .eventType("SELF_DEACTIVATED")
                .build());
    }

    @Transactional(readOnly = true)
    public UserSearchResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));
        if (!Boolean.TRUE.equals(user.getIsActive()) || !Boolean.TRUE.equals(user.getIsEmailVerified())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại");
        }
        Long currentUserId = securityUtils.getCurrentUserId();
        if (userBlockRepository.existsByBlockerIdAndBlockedId(currentUserId, id)
                || userBlockRepository.existsByBlockerIdAndBlockedId(id, currentUserId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại");
        }
        return buildUserSearchResponse(user, currentUserId);
    }

    @Transactional(readOnly = true)
    public Page<UserSearchResponse> searchUsers(String keyword, Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        return userRepository.searchUsers(keyword, currentUserId, pageable)
                .map(user -> buildUserSearchResponse(user, currentUserId));
    }

    private UserSearchResponse buildUserSearchResponse(User user, Long currentUserId) {
        boolean blocked = userBlockRepository.existsByBlockerIdAndBlockedId(currentUserId, user.getId());
        String status = "none";

        if (blocked) {
            status = "blocked";
        } else {
            Optional<Friendship> friendship = friendshipRepository.findBetweenUsers(currentUserId, user.getId());
            if (friendship.isPresent()) {
                Friendship f = friendship.get();
                if (f.getStatus() == Friendship.Status.ACCEPTED) {
                    status = "accepted";
                } else if (f.getRequester().getId().equals(currentUserId)) {
                    status = "sent";
                } else {
                    status = "received";
                }
            }
        }

        long mutualCount = friendshipRepository.countMutualFriends(currentUserId, user.getId());
        String followStatus = followRepository.findByFollowerIdAndFolloweeId(currentUserId, user.getId())
                .map(follow -> follow.getStatus().name())
                .orElse("NONE");
        boolean canSeePrivateProfileContent = !Boolean.TRUE.equals(user.getIsPrivate())
                || user.getId().equals(currentUserId)
                || "ACCEPTED".equals(followStatus);

        return UserSearchResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .coverUrl(canSeePrivateProfileContent ? user.getCoverUrl() : null)
                .bio(canSeePrivateProfileContent ? user.getBio() : null)
                .isPrivate(user.getIsPrivate())
                .followStatus(followStatus)
                .mutualFriendCount(mutualCount)
                .friendshipStatus(status)
                .build();
    }

    // Block/Unblock
    @Transactional
    public void blockUser(Long targetId) {
        Long currentUserId = securityUtils.getCurrentUserId();
        if (currentUserId.equals(targetId)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể tự chặn chính mình");
        }
        if (userBlockRepository.existsByBlockerIdAndBlockedId(currentUserId, targetId)) {
            throw new AppException(HttpStatus.CONFLICT, "Người dùng này đã bị chặn");
        }

        User blocker = securityUtils.getCurrentUser();
        User blocked = userRepository.findById(targetId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));

        UserBlock block = UserBlock.builder().blocker(blocker).blocked(blocked).build();
        userBlockRepository.save(block);

        // Remove any friendship between them
        friendshipRepository.findBetweenUsers(currentUserId, targetId)
                .ifPresent(friendshipRepository::delete);
        followRepository.deleteBetweenUsers(currentUserId, targetId);
    }

    @Transactional
    public void unblockUser(Long targetId) {
        Long currentUserId = securityUtils.getCurrentUserId();
        UserBlock block = userBlockRepository.findByBlockerIdAndBlockedId(currentUserId, targetId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Chưa chặn người dùng này"));
        userBlockRepository.delete(block);
    }

    @Transactional(readOnly = true)
    public Page<UserSearchResponse> getBlockedUsers(Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        return userBlockRepository.findByBlockerIdOrderByCreatedAtDesc(currentUserId, pageable)
                .map(block -> UserSearchResponse.builder()
                        .id(block.getBlocked().getId())
                        .fullName(block.getBlocked().getFullName())
                        .username(block.getBlocked().getUsername())
                        .avatarUrl(block.getBlocked().getAvatarUrl())
                        .bio(block.getBlocked().getBio())
                        .friendshipStatus("blocked")
                        .build());
    }
}
