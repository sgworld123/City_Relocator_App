package com.Backend.BackendApp.Service;

import com.Backend.BackendApp.Dto.CoordinatesDto;
import com.Backend.BackendApp.Dto.GmapsResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Slf4j
@RequiredArgsConstructor
public class GooglePlacesService {
    private final WebClient webClient;

    public Mono<List<GmapsResponseDto>> getNearByPlaces(double lat, double lng, String placeType)
    {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("place/nearbysearch/json")
                        .queryParam("location", lat + "," + lng)
                        .queryParam("radius", 5000)
                        .queryParam("type", placeType)
                        .build())
                .retrieve()
                .onStatus(status -> status.is5xxServerError() || status.is4xxClientError(),
                        response -> Mono.error(new RuntimeException("Error fetching from server or client")))
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(5))
                .map(this::mapToDto);
    }

    private List<GmapsResponseDto> mapToDto(Map<String, Object> response) {
        String status = (String) response.get("status");
        if (!"OK".equals(status)) {
            log.warn("Google Places API returned status: {}", status);
            return List.of();
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
        if (results == null || results.isEmpty()) return List.of();

        return results.stream()
                .map(result -> {
                    try {
                        Map<String, Object> geometry = (Map<String, Object>) result.get("geometry");
                        Map<String, Object> location = (Map<String, Object>) geometry.get("location");
                        double lat = ((Number) location.get("lat")).doubleValue();
                        double lng = ((Number) location.get("lng")).doubleValue();

                        return GmapsResponseDto.builder()
                                .name((String) result.get("name"))
                                .type(((List<String>) result.get("types")).get(0))
                                .rating(result.containsKey("rating")
                                        ? ((Number) result.get("rating")).doubleValue()
                                        : null)
                                .address((String) result.get("vicinity"))
                                .coordinatesDto(new CoordinatesDto(lat, lng))
                                .build();
                    } catch (Exception e) {
                        log.warn("Skipping malformed place result: {}", e.getMessage());
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingDouble(
                        dto -> dto.getRating() == null ? 0.0 : -dto.getRating() // descending
                ))
                .limit(5) // top 5 per type
                .toList();
    }
}
