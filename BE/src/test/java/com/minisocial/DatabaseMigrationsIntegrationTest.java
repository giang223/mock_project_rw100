package com.minisocial;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import com.minisocial.repository.AdminDashboardRepository;
import com.minisocial.repository.AdminAuditLogRepository;
import com.minisocial.repository.ConversationParticipantRepository;
import com.minisocial.repository.ConversationRepository;
import com.minisocial.repository.DirectMessageRepository;
import com.minisocial.repository.PostMentionRepository;
import com.minisocial.repository.PostMediaRepository;
import com.minisocial.repository.DirectMessageReactionRepository;
import com.minisocial.repository.PostLikeRepository;
import com.minisocial.repository.NotificationPreferenceRepository;
import com.minisocial.repository.RefreshTokenRepository;
import com.minisocial.repository.ReportRepository;
import com.minisocial.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "RUN_DB_INTEGRATION", matches = "true")
class DatabaseMigrationsIntegrationTest {

    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private TestRestTemplate restTemplate;
    @Autowired private AdminDashboardRepository adminDashboardRepository;
    @Autowired private AdminAuditLogRepository adminAuditLogRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private ConversationParticipantRepository conversationParticipantRepository;
    @Autowired private DirectMessageRepository directMessageRepository;
    @Autowired private PostMentionRepository postMentionRepository;
    @Autowired private PostMediaRepository postMediaRepository;
    @Autowired private DirectMessageReactionRepository directMessageReactionRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PostLikeRepository postLikeRepository;
    @Autowired private ReportRepository reportRepository;
    @Autowired private NotificationPreferenceRepository notificationPreferenceRepository;

    @Test
    void migrationsApplyAndHibernateValidatesLatestMysqlSchema() {
        String latestVersion = jdbcTemplate.queryForObject(
                "SELECT version FROM flyway_schema_history WHERE success = 1 " +
                        "ORDER BY installed_rank DESC LIMIT 1", String.class);

        assertEquals("27", latestVersion);
        assertTrue(columnExists("posts", "feeling"));
        assertTrue(columnExists("users", "is_private"));
        assertTrue(columnExists("follows", "status"));
        assertTrue(columnExists("posts", "is_edited"));
        assertTrue(columnExists("users", "cover_url"));
        assertTrue(tableExists("hashtags"));
        assertTrue(tableExists("stories"));
        assertTrue(tableExists("story_views"));
        assertTrue(tableExists("oauth_identities"));
        assertTrue(indexExists("oauth_identities", "uk_oauth_identity_provider_subject"));
        assertTrue(indexExists("oauth_identities", "uk_oauth_identity_user_provider"));
        assertTrue(tableExists("admin_audit_logs"));
        assertTrue(tableExists("notification_preferences"));
        assertTrue(columnExists("notification_preferences", "social_enabled"));
        assertTrue(columnExists("notification_preferences", "messages_enabled"));
        assertTrue(tableExists("notification_preferences"));
        assertTrue(tableExists("user_account_events"));
        assertTrue(tableExists("conversations"));
        assertTrue(tableExists("conversation_participants"));
        assertTrue(tableExists("direct_messages"));
        assertTrue(tableExists("post_mentions"));
        assertTrue(tableExists("post_media"));
        assertTrue(columnExists("post_likes", "reaction_type"));
        assertTrue(indexExists("post_likes", "idx_post_likes_post_reaction"));
        assertTrue(columnExists("post_media", "media_type"));
        assertTrue(columnExists("post_media", "position"));
        assertTrue(indexExists("post_media", "uk_post_media_post_position"));
        assertTrue(indexExists("post_mentions", "uk_post_mentions_post_user"));
        assertTrue(indexExists("post_mentions", "idx_post_mentions_user_created"));
        assertTrue(indexExists("direct_messages", "idx_direct_messages_conversation_created"));
        assertTrue(columnExists("direct_messages", "media_url"));
        assertTrue(columnExists("direct_messages", "media_type"));
        assertTrue(columnExists("direct_messages", "reply_to_message_id"));
        assertTrue(indexExists("direct_messages", "idx_direct_messages_reply_to"));
        assertTrue(tableExists("direct_message_reactions"));
        assertTrue(indexExists("direct_message_reactions", "uk_direct_message_reactions_message_user"));
        assertTrue(indexExists("direct_message_reactions", "idx_direct_message_reactions_message_type"));
        assertTrue(columnExists("conversation_participants", "hidden_at"));
        assertTrue(columnExists("conversation_participants", "contact_nickname"));
        assertTrue(indexExists("conversation_participants", "idx_conversation_participant_user_hidden"));
        assertNotNull(conversationRepository.findVisibleByParticipant(9_999_999L, PageRequest.of(0, 10)));
        assertNotNull(conversationParticipantRepository.findUnreadCounts(9_999_999L, java.util.List.of(9_999_999L)));
        assertNotNull(conversationParticipantRepository.findByConversationIdAndUserIdNot(9_999_999L, 9_999_999L));
        assertNotNull(conversationParticipantRepository.findByConversationIdAndUserIdNot(9_999_999L, 9_999_999L));
        assertNotNull(directMessageRepository.findLatestForConversations(java.util.List.of(9_999_999L)));
        assertNotNull(postMentionRepository.findByPostId(9_999_999L));
        assertNotNull(postMentionRepository.findMentionedUsersByPostId(9_999_999L));
        assertNotNull(userRepository.findByUsernameInAndIsActiveTrueAndIsEmailVerifiedTrue(
                java.util.List.of("ci-no-matching-mention-user")));
        assertNotNull(userRepository.findFriendSuggestions(9_999_999L, PageRequest.of(0, 10)));
        assertNotNull(postMediaRepository.findByPostIdOrderByPositionAscIdAsc(9_999_999L));
        assertNotNull(directMessageReactionRepository.findCountsByMessageIds(java.util.List.of(9_999_999L)));
        assertNotNull(postLikeRepository.findReactionSummaryByPostId(9_999_999L, 9_999_999L));
        assertNotNull(refreshTokenRepository.findActiveSessionIdsByUserId(9_999_999L, LocalDateTime.now()));
        assertTrue(indexExists("user_account_events", "idx_user_account_events_user_created"));
        assertTrue(columnExists("stories", "media_type"));
        assertTrue(columnExists("reports", "comment_id"));
        assertTrue(columnExists("reports", "reviewed_by"));
        assertTrue(columnExists("reports", "review_note"));
        assertTrue(columnExists("reports", "assigned_to"));
        assertTrue(columnExists("reports", "assigned_at"));
        assertTrue(indexExists("reports", "idx_reports_assignee_status_created"));
        assertTrue(indexExists("admin_audit_logs", "idx_admin_audit_actor_created"));
        assertTrue(indexExists("admin_audit_logs", "idx_admin_audit_action_created"));
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now().plusDays(1);
        assertNotNull(adminDashboardRepository.findActivity(start, end, false));
        assertNotNull(adminDashboardRepository.findActivity(start, end, true));
        assertNotNull(adminAuditLogRepository.search(null, null, null, start, end, PageRequest.of(0, 20)));
        assertNotNull(reportRepository.findByAssignedTo_IdOrderByCreatedAtDesc(
                9_999_999L, PageRequest.of(0, 20)));
        assertNotNull(reportRepository.findByAssignedTo_IdAndStatusOrderByCreatedAtDesc(
                9_999_999L, com.minisocial.entity.Report.Status.PENDING, PageRequest.of(0, 20)));
        assertNotNull(reportRepository.findByAssignedToIsNullOrderByCreatedAtDesc(PageRequest.of(0, 20)));
        assertNotNull(reportRepository.findByAssignedToIsNullAndStatusOrderByCreatedAtDesc(
                com.minisocial.entity.Report.Status.PENDING, PageRequest.of(0, 20)));
    }

    @Test
    void applicationAndWebSocketConfigurationStartWithReadinessAvailable() {
        var response = restTemplate.getForEntity("/actuator/health/readiness", String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    @Transactional
    void friendSuggestionQueryRanksMutualFriendsAndExcludesExistingRelations() {
        List<Long> userIds = new ArrayList<>();
        String suffix = UUID.randomUUID().toString().replace("-", "");
        try {
            Long viewer = insertUser("viewer", suffix, userIds);
            Long mutualOne = insertUser("mutual-one", suffix, userIds);
            Long mutualTwo = insertUser("mutual-two", suffix, userIds);
            Long twoMutuals = insertUser("two-mutuals", suffix, userIds);
            Long oneMutual = insertUser("one-mutual", suffix, userIds);
            Long noMutuals = insertUser("no-mutuals", suffix, userIds);
            Long blocked = insertUser("blocked", suffix, userIds);
            Long followed = insertUser("followed", suffix, userIds);
            Long pending = insertUser("pending", suffix, userIds);

            notificationPreferenceRepository.upsert(viewer, false, true);
            var preferences = notificationPreferenceRepository.findByUserId(viewer).orElseThrow();
            assertTrue(!preferences.isSocialEnabled());
            assertTrue(preferences.isMessagesEnabled());

            insertFriendship(viewer, mutualOne, "ACCEPTED");
            insertFriendship(viewer, mutualTwo, "ACCEPTED");
            insertFriendship(mutualOne, twoMutuals, "ACCEPTED");
            insertFriendship(mutualTwo, twoMutuals, "ACCEPTED");
            insertFriendship(mutualOne, oneMutual, "ACCEPTED");
            insertFriendship(mutualOne, blocked, "ACCEPTED");
            insertFriendship(mutualTwo, blocked, "ACCEPTED");
            insertFriendship(mutualOne, followed, "ACCEPTED");
            insertFriendship(mutualTwo, followed, "ACCEPTED");
            insertFriendship(viewer, pending, "PENDING");
            jdbcTemplate.update("INSERT INTO user_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)",
                    viewer, blocked, LocalDateTime.now());
            jdbcTemplate.update("INSERT INTO follows (follower_id, followee_id, created_at, status) " +
                    "VALUES (?, ?, ?, 'ACCEPTED')", viewer, followed, LocalDateTime.now());

            var suggestions = userRepository.findFriendSuggestions(viewer, PageRequest.of(0, 20));

            assertEquals(List.of(twoMutuals, oneMutual, noMutuals),
                    suggestions.getContent().stream().map(UserRepository.FriendSuggestionProjection::getId).toList());
            assertEquals(List.of(2L, 1L, 0L), suggestions.getContent().stream()
                    .map(UserRepository.FriendSuggestionProjection::getMutualFriendCount).toList());
        } finally {
            cleanupFriendSuggestionUsers(userIds);
        }
    }

    private Long insertUser(String name, String suffix, List<Long> ids) {
        String email = name + "-" + suffix + "@example.test";
        jdbcTemplate.update("INSERT INTO users (email, password_hash, full_name, username, role, " +
                        "is_email_verified, is_active, created_at) VALUES (?, 'integration-test-hash', ?, ?, " +
                        "'USER', TRUE, TRUE, ?)", email, name, name + suffix, LocalDateTime.now());
        Long id = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        ids.add(id);
        return id;
    }

    private void insertFriendship(Long requesterId, Long addresseeId, String status) {
        jdbcTemplate.update("INSERT INTO friendships (requester_id, addressee_id, status, created_at) " +
                "VALUES (?, ?, ?, ?)", requesterId, addresseeId, status, LocalDateTime.now());
    }

    private void cleanupFriendSuggestionUsers(List<Long> userIds) {
        for (Long id : userIds) {
            jdbcTemplate.update("DELETE FROM friendships WHERE requester_id = ? OR addressee_id = ?", id, id);
            jdbcTemplate.update("DELETE FROM follows WHERE follower_id = ? OR followee_id = ?", id, id);
            jdbcTemplate.update("DELETE FROM user_blocks WHERE blocker_id = ? OR blocked_id = ?", id, id);
            jdbcTemplate.update("DELETE FROM users WHERE id = ?", id);
        }
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables " +
                        "WHERE table_schema = DATABASE() AND table_name = ?", Integer.class, tableName);
        return count != null && count > 0;
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns " +
                        "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                Integer.class, tableName, columnName);
        return count != null && count > 0;
    }

    private boolean indexExists(String tableName, String indexName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.statistics " +
                        "WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?",
                Integer.class, tableName, indexName);
        return count != null && count > 0;
    }
}
