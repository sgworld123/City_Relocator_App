package com.Backend.BackendApp.Service;

import com.Backend.BackendApp.Dto.CoordinatesDto;
import com.Backend.BackendApp.Dto.GmapsResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GooglePlacesService {
    private final WebClient webClient;
    @Value("${apiKeys.GmapsApiKey}")
    private String apiKey;

    public Mono<List<GmapsResponseDto>> getNearByPlaces(double lat, double lng, String placeType)
    {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("place/nearbysearch/json")
                        .queryParam("location", lat + "," + lng)
                        .queryParam("radius", 5000)
                        .queryParam("type", placeType)
                        .queryParam("key", apiKey)
                        .build())
                .retrieve()
                .onStatus(status -> status.is5xxServerError() || status.is4xxClientError(),
                        response -> Mono.error(new RuntimeException("Error fetching from server or client")))
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(5))
                .map(this::mapToDto);
    }

    private List<GmapsResponseDto> mapToDto(Map<String,Object> response) {
        List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
        return results.stream().map(result -> {
            Map<String, Object> geometry = (Map<String, Object>) result.get("geometry");
            Map<String, Object> location = (Map<String, Object>) geometry.get("location");
            double lat = (double) location.get("lat");
            double lng = (double) location.get("lng");

            return GmapsResponseDto.builder()
                    .name((String) result.get("name"))
                    .type(((List<String>) result.get("types")).get(0))
                    .rating(result.containsKey("rating") ? ((Number) result.get("rating")).doubleValue() : null)
                    .address((String) result.get("vicinity"))
                    .coordinatesDto(new CoordinatesDto(lat, lng))
                    .build();
        }).toList();
    }
}
