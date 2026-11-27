package com.minisocial.controller;

import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.FollowActionResponse;
import com.minisocial.dto.response.FollowRequestResponse;
import com.minisocial.dto.response.UserSummaryResponse;
import com.minisocial.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/{userId}/follow")
    public ApiResponse<FollowActionResponse> follow(@PathVariable Long userId) {
        return ApiResponse.success(followService.follow(userId));
    }

    @DeleteMapping("/{userId}/follow")
    public ApiResponse<FollowActionResponse> unfollow(@PathVariable Long userId) {
        return ApiResponse.success(followService.unfollow(userId));
    }

    @GetMapping("/{userId}/followers")
    public ApiResponse<Page<UserSummaryResponse>> getFollowers(
            @PathVariable Long userId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(followService.getFollowers(userId, pageable));
    }

    @GetMapping("/{userId}/following")
    public ApiResponse<Page<UserSummaryResponse>> getFollowing(
            @PathVariable Long userId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(followService.getFollowing(userId, pageable));
    }

    @GetMapping("/me/follow-requests")
    public ApiResponse<Page<FollowRequestResponse>> getPendingRequests(
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(followService.getPendingRequests(pageable));
    }

    @PutMapping("/me/follow-requests/{requesterId}")
    public ApiResponse<FollowActionResponse> acceptRequest(@PathVariable Long requesterId) {
        return ApiResponse.success("Đã chấp nhận yêu cầu theo dõi", followService.acceptRequest(requesterId));
    }

    @DeleteMapping("/me/follow-requests/{requesterId}")
    public ApiResponse<Void> rejectRequest(@PathVariable Long requesterId) {
        followService.rejectRequest(requesterId);
        return ApiResponse.success("Đã từ chối yêu cầu theo dõi");
    }
}
