package com.Backend.BackendApp.Service;

import com.Backend.BackendApp.Dto.*;
import com.Backend.BackendApp.Entity.PlacesData;
import com.Backend.BackendApp.Repository.PlacesDataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.*;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackendService {

    private final RedisTemplate redisTemplate;
    private final PlacesDataRepository placesRepository;
    private final GooglePlacesService googlePlacesService;

    public ResponseEntity<ResponseSourcesDto> getSimilarPlaces(CityRelocationRequestDto cityRelocationRequestDto) {
        double newCityLat = cityRelocationRequestDto.getCurrent_city().getCoordinates().getLat();
        double newCityLong = cityRelocationRequestDto.getCurrent_city().getCoordinates().getLng();

        Set<String> uniquePlaceTypes = cityRelocationRequestDto.getSource_places()
                .stream()
                .map(PlaceDto::getType)
                .collect(Collectors.toSet());

        List<PlaceDetailsDto> similarPlaces = new ArrayList<>();
        Set<String> typesNotInCache = new HashSet<>();

        // Single Redis check per type
        for (String placeType : uniquePlaceTypes) {
            String redisKey = "places:geo:" + placeType;
            try{
                GeoResults<RedisGeoCommands.GeoLocation<Object>> results =
                        redisTemplate.opsForGeo()
                                .radius(redisKey,
                                        new Circle(new Point(newCityLong, newCityLat),
                                                new Distance(5, Metrics.KILOMETERS)));

                if (results.getContent().isEmpty()) {
                    typesNotInCache.add(placeType); // needs Google API call
                } else {
                    results.getContent().stream()
                            .map(result -> (String) result.getContent().getName())
                            .map(placeId -> placesRepository.findById(placeId).orElse(null))
                            .filter(Objects::nonNull)
                            .sorted(Comparator.comparingDouble(
                                    placeData -> placeData.getRating() == null ? 0.0 : -placeData.getRating() // descending
                            ))
                            .limit(5) // top 5 per type
                            .map(placeData -> PlaceDetailsDto.builder()
                                    .name(placeData.getName())
                                    .type(placeData.getType())
                                    .rating(placeData.getRating())
                                    .address(placeData.getAddress())
                                    .coordinatesDto(placeData.getCoordinatesDto())
                                    .build())
                            .forEach(similarPlaces::add);
                }
            }
            catch (Exception e){
                log.error("Error accessing Redis for type {}: {}", placeType, e.getMessage());
                typesNotInCache.add(placeType); // fallback to Google API if Redis fails
            }
        }

        // Fetch all uncached types concurrently in one shot
        if (!typesNotInCache.isEmpty()) {
            List<Mono<List<GmapsResponseDto>>> requests = typesNotInCache.stream()
                    .map(type -> googlePlacesService.getNearByPlaces(newCityLat, newCityLong, type))
                    .toList();

            List<PlaceDetailsDto> googleResults = Flux.merge(requests)
                    .flatMap(Flux::fromIterable)
                    .map(result -> PlaceDetailsDto.builder()
                            .name(result.getName())
                            .type(result.getType())
                            .rating(result.getRating())
                            .address(result.getAddress())
                            .coordinatesDto(result.getCoordinatesDto())
                            .build())
                    .collectList()
                    .block(); // safe — Tomcat thread

            if (googleResults != null) {
                similarPlaces.addAll(googleResults);
                googleResults.forEach(this::addPlaceData);
            }
        }

        return ResponseEntity.ok(ResponseSourcesDto.builder().results(similarPlaces).build());
    }

    public boolean addPlaceData(PlaceDetailsDto placeDetailsDtos) {
        try {
            PlacesData placesData = PlacesData.builder()
                    .name(placeDetailsDtos.getName())
                    .type(placeDetailsDtos.getType())
                    .rating(placeDetailsDtos.getRating())
                    .address(placeDetailsDtos.getAddress())
                    .coordinatesDto(placeDetailsDtos.getCoordinatesDto())
                    .build();
            PlacesData savedPlace = placesRepository.save(placesData);
            String redisKey = "places:geo:" + savedPlace.getType();
            redisTemplate.opsForGeo().add(redisKey,
                    new Point(savedPlace.getCoordinatesDto().getLng(), savedPlace.getCoordinatesDto().getLat()),
                    savedPlace.getId());
            return true;
        } catch (Exception e) {
            log.error("Failed to save place data: {}", e.getMessage());
            return false;
        }
    }
}
