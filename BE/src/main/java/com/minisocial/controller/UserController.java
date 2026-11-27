package com.minisocial.controller;

import com.minisocial.dto.request.ChangePasswordRequest;
import com.minisocial.dto.request.DeactivateAccountRequest;
import com.minisocial.dto.request.UpdateProfileRequest;
import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.UserResponse;
import com.minisocial.dto.response.UserSearchResponse;
import com.minisocial.dto.response.PostResponse;
import com.minisocial.security.AuthCookieService;
import com.minisocial.service.PostService;
import com.minisocial.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuthCookieService authCookieService;
    private final PostService postService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> getMyProfile() {
        return ApiResponse.success(userService.getMyProfile());
    }

    @PutMapping("/me")
    public ApiResponse<UserResponse> updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.success("Cập nhật hồ sơ thành công", userService.updateProfile(request));
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookieService.clearRefreshCookie().toString())
                .body(ApiResponse.success("Đổi mật khẩu thành công"));
    }

    @PostMapping("/me/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateAccount(
            @Valid @RequestBody DeactivateAccountRequest request) {
        userService.deactivateAccount(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookieService.clearRefreshCookie().toString())
                .body(ApiResponse.success("Tài khoản đã được vô hiệu hóa"));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UserResponse> uploadAvatar(@RequestPart("file") MultipartFile file) throws java.io.IOException {
        return ApiResponse.success("Cập nhật ảnh đại diện thành công", userService.uploadAvatar(file));
    }

    @PostMapping(value = "/me/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UserResponse> uploadCover(@RequestPart("file") MultipartFile file) throws java.io.IOException {
        return ApiResponse.success("Cập nhật ảnh bìa thành công", userService.uploadCover(file));
    }

    @GetMapping("/search")
    public ApiResponse<Page<UserSearchResponse>> searchUsers(
            @RequestParam(defaultValue = "") String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(userService.searchUsers(q.trim(), pageable));
    }

    @GetMapping("/block")
    public ApiResponse<Page<UserSearchResponse>> getBlockedUsers(@PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(userService.getBlockedUsers(pageable));
    }

    @PostMapping("/block/{targetId}")
    public ApiResponse<Void> blockUser(@PathVariable Long targetId) {
        userService.blockUser(targetId);
        return ApiResponse.success("Đã chặn người dùng");
    }

    @DeleteMapping("/block/{targetId}")
    public ApiResponse<Void> unblockUser(@PathVariable Long targetId) {
        userService.unblockUser(targetId);
        return ApiResponse.success("Đã bỏ chặn người dùng");
    }

    @GetMapping("/{id}")
    public ApiResponse<UserSearchResponse> getPublicProfile(@PathVariable Long id) {
        return ApiResponse.success(userService.getUserById(id));
    }

    @GetMapping("/{id}/posts")
    public ApiResponse<Page<PostResponse>> getUserPosts(
            @PathVariable Long id,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(postService.getUserPosts(id, pageable));
    }
}
