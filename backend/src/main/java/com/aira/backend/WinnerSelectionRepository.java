package com.aira.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;


@Repository
interface WinnerSelectionRepository extends JpaRepository<WinnerSelection, Long> {
    List<WinnerSelection> findBySessionId(String sessionId);
    List<WinnerSelection> findByModelIdentifier(String modelIdentifier);
}
