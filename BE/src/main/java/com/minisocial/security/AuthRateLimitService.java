package com.minisocial.security;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class AuthRateLimitService {

    private static final int MAX_BUCKETS = 50_000;
    private static final long CLEANUP_INTERVAL_MILLIS = Duration.ofMinutes(1).toMillis();

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicLong lastCleanup = new AtomicLong();

    public Decision acquire(String key, int limit, Duration windowDuration) {
        long now = System.currentTimeMillis();
        long durationMillis = windowDuration.toMillis();
        cleanupIfNeeded(now);

        if (!windows.containsKey(key) && windows.size() >= MAX_BUCKETS) {
            return new Decision(false, Math.max(1, durationMillis / 1000));
        }

        AtomicBoolean allowed = new AtomicBoolean();
        AtomicLong retryAfterMillis = new AtomicLong(durationMillis);
        windows.compute(key, (ignored, current) -> {
            Window active = current;
            if (active == null || active.resetAtMillis <= now) {
                active = new Window(now + durationMillis, 0);
            }
            active.count++;
            allowed.set(active.count <= limit);
            retryAfterMillis.set(Math.max(1, active.resetAtMillis - now));
            return active;
        });

        return new Decision(allowed.get(), Math.max(1, (retryAfterMillis.get() + 999) / 1000));
    }

    private void cleanupIfNeeded(long now) {
        long previous = lastCleanup.get();
        if (now - previous < CLEANUP_INTERVAL_MILLIS
                || !lastCleanup.compareAndSet(previous, now)) {
            return;
        }

        windows.entrySet().removeIf(entry -> entry.getValue().resetAtMillis <= now);
    }

    private static final class Window {
        private final long resetAtMillis;
        private int count;

        private Window(long resetAtMillis, int count) {
            this.resetAtMillis = resetAtMillis;
            this.count = count;
        }
    }

    public record Decision(boolean allowed, long retryAfterSeconds) {
    }
}
