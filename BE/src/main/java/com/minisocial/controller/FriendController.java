package com.minisocial.controller;

import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.FriendshipResponse;
import com.minisocial.dto.response.UserSearchResponse;
import com.minisocial.service.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    @PostMapping("/request/{targetId}")
    public ApiResponse<FriendshipResponse> sendRequest(@PathVariable Long targetId) {
        return ApiResponse.success("Đã gửi lời mời kết bạn", friendService.sendFriendRequest(targetId));
    }

    @PutMapping("/request/{requestId}/accept")
    public ApiResponse<FriendshipResponse> acceptRequest(@PathVariable Long requestId) {
        return ApiResponse.success("Đã chấp nhận lời mời", friendService.acceptFriendRequest(requestId));
    }

    @DeleteMapping("/request/{requestId}")
    public ResponseEntity<Void> rejectOrCancelRequest(@PathVariable Long requestId) {
        friendService.rejectOrCancelRequest(requestId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{friendId}")
    public ResponseEntity<Void> unfriend(@PathVariable Long friendId) {
        friendService.unfriend(friendId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/requests/received")
    public ApiResponse<Page<FriendshipResponse>> receivedRequests(
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(friendService.getReceivedRequests(pageable));
    }

    @GetMapping("/requests/sent")
    public ApiResponse<Page<FriendshipResponse>> sentRequests(
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(friendService.getSentRequests(pageable));
    }

    @GetMapping
    public ApiResponse<Page<FriendshipResponse>> friends(@PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(friendService.getFriends(pageable));
    }

    @GetMapping("/suggestions")
    public ApiResponse<Page<UserSearchResponse>> suggestions(@PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(friendService.getFriendSuggestions(pageable));
    }
}
