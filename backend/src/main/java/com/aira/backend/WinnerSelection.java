package com.aira.backend;

import jakarta.persistence.*;
import java.util.Date;

// WinnerSelection Entity
@Entity
@Table(name = "winner_selections")
class WinnerSelection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "model_identifier", nullable = false)
    private String modelIdentifier;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String prompt;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String response;
    
    @Column(name = "selected_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date selectedAt = new Date();
    
    @Column(name = "session_id")
    private String sessionId;
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getModelIdentifier() { return modelIdentifier; }
    public void setModelIdentifier(String modelIdentifier) { this.modelIdentifier = modelIdentifier; }
    
    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }
    
    public String getResponse() { return response; }
    public void setResponse(String response) { this.response = response; }
    
    public Date getSelectedAt() { return selectedAt; }
    public void setSelectedAt(Date selectedAt) { this.selectedAt = selectedAt; }
    
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
}