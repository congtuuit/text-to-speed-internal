# Test Checklist: Worker Configuration & Plan-based Limits Verification

This checklist covers test scenarios to verify both system-wide worker allocation (configured in admin settings) and per-user limits based on their subscription tier.

---

## 🛠️ Part 1: Admin Configuration (System Workers)

These test cases ensure the administrator can adjust the max concurrent system workers and that the queue manager behaves accordingly.

- [ ] **TC-SYS-01: Verify Default Worker Count**
  - **Setup:** Fresh database or setting `max_workers` not configured.
  - **Steps:** Check `/api/admin/stats`.
  - **Expected:** `max_workers` defaults to `3` (or the system fallback) and no crash occurs.

- [ ] **TC-SYS-02: Modify Max Workers via Admin Settings**
  - **Setup:** Change the `max_workers` value in the Settings table (e.g., from `3` to `5`).
  - **Steps:** Restart the queue manager or trigger reload. Query `/api/admin/stats`.
  - **Expected:** `max_workers` is updated correctly to `5`.

- [ ] **TC-SYS-03: System Active Workers Tracking**
  - **Setup:** Start `N` long-running audio generation tasks.
  - **Steps:** Check `/api/admin/stats` while tasks are running.
  - **Expected:** 
    - `busy_workers` equals the number of currently processing tasks.
    - `active_workers` correctly reflects the number of running worker threads.

- [ ] **TC-SYS-04: System Capacity Hard Cap**
  - **Setup:** Set `max_workers` to `2`. Submit `4` tasks simultaneously.
  - **Steps:** Monitor the `FileTask` status in the database.
  - **Expected:** Only `2` tasks enter `Processing` status at the same time; the remaining `2` tasks remain in `Pending` state.

---

## 💎 Part 2: User limits by Subscription Plan

These test cases verify that individual users are throttled or permitted to run concurrent jobs according to their `UserSubscription` tier.

- [ ] **TC-USR-01: Free Tier Concurrent Limit (Default: 1)**
  - **Setup:** User is on the Free tier (`concurrent_jobs = 1`).
  - **Steps:** 
    - Submit `3` audio files for generation.
    - Check `/api/jobs/progress`.
  - **Expected:**
    - Only `1` task is in `Processing` status.
    - `worker_stats.user_limit` returns `1`.
    - `worker_stats.user_active` returns `1`.
    - `worker_stats.user_available` returns `0`.
    - The other `2` tasks remain `Pending`.

- [ ] **TC-USR-02: Premium Tier Concurrent Limit (e.g., Limit: 3)**
  - **Setup:** User has `concurrent_jobs = 3` in `UserSubscription`.
  - **Steps:**
    - Submit `4` audio tasks.
  - **Expected:**
    - Up to `3` tasks process concurrently (if system capacity allows).
    - `worker_stats.user_limit` returns `3`.
    - `worker_stats.user_active` returns `3`.

- [ ] **TC-USR-03: Unlimited Tier Concurrent Limit (Limit: -1)**
  - **Setup:** User has `concurrent_jobs = -1` (Unlimited).
  - **Steps:**
    - System `max_workers` is set to `5`.
    - User submits `6` tasks.
  - **Expected:**
    - User bypasses user-level limits.
    - Up to `5` tasks process simultaneously, bound only by system `max_workers`.
    - `worker_stats.user_available` matches `system_available`.

- [ ] **TC-USR-04: Cross-User Isolation**
  - **Setup:** 
    - User A (Free, Limit: 1) has `1` processing task.
    - User B (Premium, Limit: 3) has `0` active tasks.
  - **Steps:** User B submits `2` tasks.
  - **Expected:** User B's tasks start processing immediately because User A's limit does not block User B's capacity.

- [ ] **TC-USR-05: System Capacity Bottleneck**
  - **Setup:**
    - System `max_workers` is set to `2`.
    - User A (Premium, Limit: 3) submits `3` tasks.
  - **Steps:** Monitor system and user stats.
  - **Expected:**
    - Only `2` tasks process because the system-level workers are fully busy (`system_available = 0`).
    - `worker_stats.user_available` is `0` (constrained by system capacity).

---

## 🧪 Part 3: Live Integration & Edge Cases

- [ ] **TC-INT-01: Dynamically Changing Subscription Mid-process**
  - **Steps:**
    - While a Free user has `1` job processing and `1` job pending, update their database record to `concurrent_jobs = 3`.
  - **Expected:** The pending job should automatically start processing on the next worker cycle without restarting the server.

- [ ] **TC-INT-02: Task Completion Slot Release**
  - **Steps:** A Free user runs `1` job. Wait for it to complete (`Success` or `Failed`).
  - **Expected:** `user_active` drops to `0`, `user_available` returns to `1`, and a pending task starts processing.
