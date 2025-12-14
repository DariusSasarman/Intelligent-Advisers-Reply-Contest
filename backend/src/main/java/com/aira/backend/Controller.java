package com.aira.backend;

import java.util.*;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@CrossOrigin(origins = "*", allowCredentials = "true")
public class Controller {
    
    @Value("${app.encryption.key:YourSecretKey12345}")
    private String encryptionKey;
    
    @Autowired
    private ApiKeyRepository apiKeyRepository;
    
    @Autowired
    private WinnerSelectionRepository winnerRepository;
    
    @Autowired
    private ChatHistoryRepository chatHistoryRepository;
    
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @PostMapping("/api/models/provider")
    public Map<String, Object> getModels(@RequestBody Map<String, String> body) {
        String providerName = body.get("provider");
        List<String> models;
        
        switch(providerName.toLowerCase()) {
            case "openai":
                models = List.of("gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "gpt-3.5-turbo-16k");
                break;
            case "claude":
                models = List.of("claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-3-5-sonnet-20241022", 
                               "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307");
                break;
            case "cohere":
                models = List.of("command-r-plus", "command-r", "command", "command-light");
                break;
            case "copilot":
                models = List.of("gpt-4-turbo", "gpt-4");
                break;
            case "deepseek":
                models = List.of("deepseek-chat", "deepseek-coder");
                break;
            case "gemini":
                models = List.of("gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro");
                break;
            case "grok":
                models = List.of("grok-beta", "grok-vision-beta");
                break;
            case "llama":
                models = List.of("llama-3.3-70b-instruct", "llama-3.1-405b-instruct", "llama-3.1-70b-instruct", 
                               "llama-3.1-8b-instruct", "llama-3-70b-instruct", "llama-3-8b-instruct");
                break;
            case "mistral":
                models = List.of("mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", 
                               "mixtral-8x7b-instruct", "mixtral-8x22b-instruct");
                break;
            case "qwen":
                models = List.of("qwen-turbo", "qwen-plus", "qwen-max", "qwen2.5-72b-instruct", "qwen2.5-7b-instruct");
                break;
            default:
                models = List.of();
                break;
        }
        
        return Map.of("models", models);
    }
    
    @PostMapping("/api/keys/save")
    public ResponseEntity<Map<String, Object>> saveApiKey(
            @RequestBody Map<String, String> body,
            HttpServletRequest request,
            HttpServletResponse response) {
        try {
            String provider = body.get("provider");
            String apiKey = body.get("apiKey");
            
            if (provider == null || apiKey == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Provider and API key are required"));
            }
            
            String encrypted = encrypt(apiKey);
            String sessionId = getOrCreateSessionId(request, response);
            
            // Save to database
            ApiKey apiKeyEntity = apiKeyRepository.findBySessionIdAndProvider(sessionId, provider)
                .orElse(new ApiKey());
            
            apiKeyEntity.setSessionId(sessionId);
            apiKeyEntity.setProvider(provider);
            apiKeyEntity.setEncryptedKey(encrypted);
            apiKeyEntity.setUpdatedAt(new Date());
            
            apiKeyRepository.save(apiKeyEntity);
            
            return ResponseEntity.ok(Map.of("success", true, "message", "API key saved successfully"));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to save API key: " + e.getMessage()));
        }
    }
    
    @PostMapping("/api/keys/get")
    public ResponseEntity<Map<String, Object>> getApiKey(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        try {
            String provider = body.get("provider");
            String sessionId = getSessionId(request);
            
            if (sessionId == null) {
                return ResponseEntity.ok(Map.of("apiKey", (Object) null));
            }
            
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findBySessionIdAndProvider(sessionId, provider);
            
            if (apiKeyOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of("apiKey", (Object) null));
            }
            
            return ResponseEntity.ok(Map.of("apiKey", apiKeyOpt.get().getEncryptedKey()));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to retrieve API key"));
        }
    }
    
    @PostMapping("/api/process")
    public ResponseEntity<Map<String, Object>> processChat(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        long startTime = System.currentTimeMillis();
        
        try {
            String modelIdentifier = body.get("modelIdentifier");
            String prompt = body.get("prompt");
            String encryptedApiKey = body.get("encryptedApiKey");
            
            String provider = modelIdentifier.split("-")[0];
            String modelName = extractModelName(modelIdentifier);
            String apiKey = decrypt(encryptedApiKey);
            
            String aiResponse = callAiApi(provider, modelName, prompt, apiKey);
            
            // Save to chat history
            String sessionId = getSessionId(request);
            if (sessionId != null) {
                ChatHistory history = new ChatHistory();
                history.setSessionId(sessionId);
                history.setModelIdentifier(modelIdentifier);
                history.setPrompt(prompt);
                history.setResponse(aiResponse);
                history.setResponseTimeMs((int)(System.currentTimeMillis() - startTime));
                chatHistoryRepository.save(history);
            }
            
            return ResponseEntity.ok(Map.of("reply", aiResponse, "success", true));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage(), "success", false));
        }
    }
    
    @PostMapping("/api/select-winner")
    public ResponseEntity<Map<String, Object>> selectWinner(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        try {
            String modelIdentifier = body.get("modelIdentifier");
            String prompt = body.get("prompt");
            String aiResponse = body.get("response");
            String sessionId = getSessionId(request);
            
            WinnerSelection winner = new WinnerSelection();
            winner.setModelIdentifier(modelIdentifier);
            winner.setPrompt(prompt);
            winner.setResponse(aiResponse);
            winner.setSessionId(sessionId);
            
            winnerRepository.save(winner);
            
            return ResponseEntity.ok(Map.of("success", true, "message", "Winner recorded successfully"));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to record winner"));
        }
    }
    
    // AI API calling methods remain the same
    private String callAiApi(String provider, String model, String prompt, String apiKey) throws Exception {
        return switch (provider.toLowerCase()) {
            case "openai" -> callOpenAI(model, prompt, apiKey);
            case "claude" -> callClaude(model, prompt, apiKey);
            case "gemini" -> callGemini(model, prompt, apiKey);
            default -> throw new UnsupportedOperationException("Provider not supported: " + provider);
        };
    }
    
    private String callOpenAI(String model, String prompt, String apiKey) throws Exception {
        String url = "https://api.openai.com/v1/chat/completions";
        Map<String, Object> requestBody = Map.of(
            "model", model,
            "messages", List.of(Map.of("role", "user", "content", prompt)),
            "max_tokens", 1000
        );
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
            .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) throw new RuntimeException("API call failed: " + response.body());
        
        JsonNode jsonResponse = objectMapper.readTree(response.body());
        return jsonResponse.at("/choices/0/message/content").asText();
    }
    
    private String callClaude(String model, String prompt, String apiKey) throws Exception {
        String url = "https://api.anthropic.com/v1/messages";
        Map<String, Object> requestBody = Map.of(
            "model", model,
            "max_tokens", 1000,
            "messages", List.of(Map.of("role", "user", "content", prompt))
        );
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
            .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) throw new RuntimeException("API call failed: " + response.body());
        
        JsonNode jsonResponse = objectMapper.readTree(response.body());
        return jsonResponse.at("/content/0/text").asText();
    }
    
    private String callGemini(String model, String prompt, String apiKey) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
            .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) throw new RuntimeException("API call failed: " + response.body());
        
        JsonNode jsonResponse = objectMapper.readTree(response.body());
        return jsonResponse.at("/candidates/0/content/parts/0/text").asText();
    }
    
    private String extractModelName(String modelIdentifier) {
        String[] parts = modelIdentifier.split("-");
        if (parts.length < 3) return "";
        return String.join("-", Arrays.copyOfRange(parts, 1, parts.length - 1));
    }
    
    private String getOrCreateSessionId(HttpServletRequest request, HttpServletResponse response) {
        String sessionId = getSessionId(request);
        if (sessionId == null) {
            sessionId = UUID.randomUUID().toString();
            Cookie cookie = new Cookie("sessionId", sessionId);
            cookie.setMaxAge(60 * 60 * 24 * 30);
            cookie.setPath("/");
            cookie.setHttpOnly(true);
            response.addCookie(cookie);
        }
        return sessionId;
    }
    
    private String getSessionId(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("sessionId".equals(cookie.getName())) return cookie.getValue();
            }
        }
        return null;
    }
    
    private String encrypt(String data) throws Exception {
        SecretKeySpec key = new SecretKeySpec(padKey(encryptionKey).getBytes(), "AES");
        Cipher cipher = Cipher.getInstance("AES");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        return Base64.getEncoder().encodeToString(cipher.doFinal(data.getBytes()));
    }
    
    private String decrypt(String encryptedData) throws Exception {
        SecretKeySpec key = new SecretKeySpec(padKey(encryptionKey).getBytes(), "AES");
        Cipher cipher = Cipher.getInstance("AES");
        cipher.init(Cipher.DECRYPT_MODE, key);
        return new String(cipher.doFinal(Base64.getDecoder().decode(encryptedData)));
    }
    
    private String padKey(String key) {
        if (key.length() >= 16) return key.substring(0, 16);
        return String.format("%-16s", key).replace(' ', '0');
    }
}