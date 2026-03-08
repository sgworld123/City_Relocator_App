package com.Backend.BackendApp.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {
    @Bean
    public WebClient webClient(WebClient.Builder builder,
                               @Value("${urls.GmapsUrl}") String baseUrl,
                               @Value("${apiKeys.RapidApiKey}") String rapidApiKey) {
        return builder
                .baseUrl(baseUrl)
                .defaultHeader("x-rapidapi-host", "google-map-places.p.rapidapi.com")
                .defaultHeader("x-rapidapi-key", rapidApiKey)
                .build();
    }
}