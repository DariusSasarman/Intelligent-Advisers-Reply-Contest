package com.aira.backend;

import jakarta.persistence.*;
import java.util.Date;

// ChatHistory Entity
@Entity
@Table(name = "chat_history")
class ChatHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "session_id", nullable = false)
    private String sessionId;
    
    @Column(name = "model_identifier", nullable = false)
    private String modelIdentifier;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String prompt;
    
    @Column(columnDefinition = "TEXT")
    private String response;
    
    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();
    
    @Column(name = "response_time_ms")
    private Integer responseTimeMs;
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    
    public String getModelIdentifier() { return modelIdentifier; }
    public void setModelIdentifier(String modelIdentifier) { this.modelIdentifier = modelIdentifier; }
    
    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }
    
    public String getResponse() { return response; }
    public void setResponse(String response) { this.response = response; }
    
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    
    public Integer getResponseTimeMs() { return responseTimeMs; }
    public void setResponseTimeMs(Integer responseTimeMs) { this.responseTimeMs = responseTimeMs; }
}