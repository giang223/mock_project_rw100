package com.minisocial.controller;

import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.FileUploadResponse;
import com.minisocial.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FileUploadResponse> upload(@RequestPart("file") MultipartFile file) throws IOException {
        String url = fileStorageService.uploadFile(file, "posts");
        return ApiResponse.success("Tải ảnh lên thành công",
                FileUploadResponse.builder().url(url).mediaType("IMAGE").build());
    }

    @PostMapping(value = "/upload/video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FileUploadResponse> uploadStoryVideo(@RequestPart("file") MultipartFile file)
            throws IOException {
        String url = fileStorageService.uploadVideoFile(file, "stories");
        return ApiResponse.success("Tải video Story lên thành công",
                FileUploadResponse.builder().url(url).mediaType("VIDEO").build());
    }
}
