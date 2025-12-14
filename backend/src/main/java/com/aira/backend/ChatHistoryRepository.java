package com.aira.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
interface ChatHistoryRepository extends JpaRepository<ChatHistory, Long> {
    List<ChatHistory> findBySessionId(String sessionId);
    List<ChatHistory> findByModelIdentifier(String modelIdentifier);
    List<ChatHistory> findBySessionIdOrderByCreatedAtDesc(String sessionId);
}