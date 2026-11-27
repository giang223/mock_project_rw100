package com.minisocial.controller;

import com.minisocial.dto.request.CreateStoryRequest;
import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.StoryResponse;
import com.minisocial.dto.response.UserSummaryResponse;
import com.minisocial.service.StoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @GetMapping
    public ApiResponse<Page<StoryResponse>> getActiveStories(
            @RequestParam(required = false) Long authorId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(storyService.getActiveStories(authorId, pageable));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StoryResponse>> createStory(
            @Valid @RequestBody CreateStoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo Story thành công", storyService.createStory(request)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<StoryResponse>> createStoryWithMedia(
            @Valid @ModelAttribute CreateStoryRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file) throws java.io.IOException {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo Story thành công",
                        storyService.createStoryWithMedia(request, file)));
    }

    @PostMapping("/{storyId}/view")
    public ApiResponse<Map<String, Boolean>> recordView(@PathVariable Long storyId) {
        return ApiResponse.success(Map.of("newView", storyService.recordView(storyId)));
    }

    @GetMapping("/{storyId}/views")
    public ApiResponse<Page<UserSummaryResponse>> getStoryViewers(
            @PathVariable Long storyId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(storyService.getStoryViewers(storyId, pageable));
    }

    @DeleteMapping("/{storyId}")
    public ResponseEntity<Void> deleteStory(@PathVariable Long storyId) {
        storyService.deleteStory(storyId);
        return ResponseEntity.noContent().build();
    }
}
