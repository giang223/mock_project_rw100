package com.minisocial.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.HtmlUtils;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail-from}")
    private String mailFrom;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendVerificationEmail(VerificationEmailRequested event) {
        String safeName = HtmlUtils.htmlEscape(event.fullName());
        String html = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #4f46e5;">Xác minh email MiniSocial</h2>
                  <p>Xin chào <strong>%s</strong>,</p>
                  <p>Cảm ơn bạn đã đăng ký. Nhập mã xác minh bên dưới trong ứng dụng:</p>
                  <p style="font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">%s</p>
                  <p style="color: #6b7280; font-size: 14px;">Mã này sẽ hết hạn sau 10 phút.</p>
                  <p style="color: #6b7280; font-size: 14px;">Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
                </div>
                """.formatted(safeName, event.code());
        sendHtmlEmail(event.email(), "Xác minh email MiniSocial", html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendPasswordResetEmail(PasswordResetEmailRequested event) {
        String safeName = HtmlUtils.htmlEscape(event.fullName());
        String normalizedFrontendUrl = frontendUrl.endsWith("/")
                ? frontendUrl.substring(0, frontendUrl.length() - 1)
                : frontendUrl;
        String resetUrl = HtmlUtils.htmlEscape(
                normalizedFrontendUrl + "/reset-password?token=" + event.token());
        String html = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #4f46e5;">Đặt lại mật khẩu MiniSocial</h2>
                  <p>Xin chào <strong>%s</strong>,</p>
                  <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu từ bạn. Nhấn nút bên dưới:</p>
                  <a href="%s" style="display: inline-block; padding: 12px 24px; background-color: #ef4444;
                     color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                    Đặt lại mật khẩu
                  </a>
                  <p style="color: #6b7280; font-size: 14px;">Link này sẽ hết hạn sau 1 giờ.</p>
                  <p style="color: #6b7280; font-size: 14px;">Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>
                </div>
                """.formatted(safeName, resetUrl);
        sendHtmlEmail(event.email(), "Đặt lại mật khẩu MiniSocial", html);
    }

    private void sendHtmlEmail(String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Authentication email sent successfully");
        } catch (Exception e) {
            log.error("Authentication email delivery failed: {}", e.getMessage());
        }
    }
}
