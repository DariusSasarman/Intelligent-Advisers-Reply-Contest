package com.aira.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    Optional<ApiKey> findBySessionIdAndProvider(String sessionId, String provider);
    List<ApiKey> findBySessionId(String sessionId);
}
