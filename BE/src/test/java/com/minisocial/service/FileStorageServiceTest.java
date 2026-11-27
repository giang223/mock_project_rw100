package com.minisocial.service;

import com.cloudinary.Cloudinary;
import com.minisocial.exception.AppException;
import com.minisocial.entity.PostMedia;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {

    @Mock private Cloudinary cloudinary;
    @InjectMocks private FileStorageService fileStorageService;

    @Test
    void rejectsVideoWithSpoofedMimeTypeAndUnsupportedSignature() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "movie.mp4", "video/mp4", "not a video".getBytes(java.nio.charset.StandardCharsets.UTF_8));

        assertThrows(AppException.class, () -> fileStorageService.uploadVideoFile(file, "stories"));
        verifyNoInteractions(cloudinary);
    }

    @Test
    void detectsPostMediaTypeFromFileSignatureInsteadOfDeclaredMimeType() throws Exception {
        byte[] pngSignature = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        MockMultipartFile file = new MockMultipartFile("file", "payload.bin", "application/octet-stream", pngSignature);

        assertEquals(PostMedia.MediaType.IMAGE, fileStorageService.validatePostMediaFile(file));
        verifyNoInteractions(cloudinary);
    }
}
