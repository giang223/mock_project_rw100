package com.minisocial.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.minisocial.entity.PostMedia;
import com.minisocial.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private static final long MAX_IMAGE_SIZE_BYTES = 10L * 1024 * 1024;
    private static final long MAX_VIDEO_SIZE_BYTES = 25L * 1024 * 1024;

    private final Cloudinary cloudinary;

    public String uploadFile(MultipartFile file, String folder) throws IOException {
        byte[] fileBytes = readFileWithinLimit(file, MAX_IMAGE_SIZE_BYTES, "10MB");
        if (fileBytes.length > MAX_IMAGE_SIZE_BYTES) {
            throw new AppException(HttpStatus.PAYLOAD_TOO_LARGE, "File không được vượt quá 10MB");
        }
        if (!hasSupportedImageSignature(fileBytes)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF hợp lệ");
        }

        Map<?, ?> uploadResult = cloudinary.uploader().upload(
                fileBytes,
                ObjectUtils.asMap(
                        "folder", "minisocial/" + folder,
                        "resource_type", "image",
                        "quality", "auto",
                        "fetch_format", "auto"
                )
        );

        String url = (String) uploadResult.get("secure_url");
        log.info("File uploaded to Cloudinary: {}", url);
        return url;
    }

    public String uploadVideoFile(MultipartFile file, String folder) throws IOException {
        byte[] fileBytes = readFileWithinLimit(file, MAX_VIDEO_SIZE_BYTES, "25MB");
        if (!hasSupportedVideoSignature(fileBytes)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chỉ chấp nhận video MP4, MOV hoặc WebM hợp lệ");
        }
        Map<?, ?> uploadResult = cloudinary.uploader().upload(
                fileBytes,
                ObjectUtils.asMap(
                        "folder", "minisocial/" + folder,
                        "resource_type", "video",
                        "quality", "auto",
                        "fetch_format", "auto"
                )
        );
        String url = (String) uploadResult.get("secure_url");
        log.info("Video uploaded to Cloudinary: {}", url);
        return url;
    }

    public PostMedia.MediaType validatePostMediaFile(MultipartFile file) throws IOException {
        byte[] fileBytes = readFileWithinLimit(file, MAX_VIDEO_SIZE_BYTES, "25MB");
        if (hasSupportedImageSignature(fileBytes)) {
            if (fileBytes.length > MAX_IMAGE_SIZE_BYTES) {
                throw new AppException(HttpStatus.PAYLOAD_TOO_LARGE, "Ảnh không được vượt quá 10MB");
            }
            return PostMedia.MediaType.IMAGE;
        }
        if (hasSupportedVideoSignature(fileBytes)) {
            return PostMedia.MediaType.VIDEO;
        }
        throw new AppException(HttpStatus.BAD_REQUEST,
                "Chỉ chấp nhận ảnh JPEG, PNG, WebP, GIF hoặc video MP4, MOV, WebM hợp lệ");
    }

    private byte[] readFileWithinLimit(MultipartFile file, long maximumSize, String sizeLabel) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "File không được trống");
        }
        if (file.getSize() > maximumSize) {
            throw new AppException(HttpStatus.PAYLOAD_TOO_LARGE, "File không được vượt quá " + sizeLabel);
        }
        byte[] bytes = file.getBytes();
        if (bytes.length == 0) {
            throw new AppException(HttpStatus.BAD_REQUEST, "File không được trống");
        }
        if (bytes.length > maximumSize) {
            throw new AppException(HttpStatus.PAYLOAD_TOO_LARGE, "File không được vượt quá " + sizeLabel);
        }
        return bytes;
    }

    private boolean hasSupportedImageSignature(byte[] bytes) {
        if (startsWith(bytes, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF})) {
            return true;
        }
        if (startsWith(bytes, new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        })) {
            return true;
        }
        if (startsWithAscii(bytes, 0, "GIF87a") || startsWithAscii(bytes, 0, "GIF89a")) {
            return true;
        }
        return startsWithAscii(bytes, 0, "RIFF") && startsWithAscii(bytes, 8, "WEBP");
    }

    private boolean hasSupportedVideoSignature(byte[] bytes) {
        if (startsWith(bytes, new byte[]{0x1A, 0x45, (byte) 0xDF, (byte) 0xA3})) {
            return true;
        }
        if (bytes.length < 12 || !startsWithAscii(bytes, 4, "ftyp")) {
            return false;
        }
        String brand = new String(bytes, 8, 4, java.nio.charset.StandardCharsets.US_ASCII);
        return java.util.Set.of("isom", "iso2", "mp41", "mp42", "avc1", "qt  ", "3gp4", "M4V ")
                .contains(brand);
    }

    private boolean startsWith(byte[] bytes, byte[] signature) {
        if (bytes.length < signature.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if (bytes[index] != signature[index]) {
                return false;
            }
        }
        return true;
    }

    private boolean startsWithAscii(byte[] bytes, int offset, String signature) {
        if (bytes.length < offset + signature.length()) {
            return false;
        }
        for (int index = 0; index < signature.length(); index++) {
            if (bytes[offset + index] != (byte) signature.charAt(index)) {
                return false;
            }
        }
        return true;
    }

    public void deleteFile(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException e) {
            log.error("Failed to delete file from Cloudinary: {}", e.getMessage());
        }
    }
}
